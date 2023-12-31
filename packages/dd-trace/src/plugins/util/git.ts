import { execFileSync } from 'node:child_process';
import { join } from 'https://deno.land/std@0.204.0/path/join.ts';

import log from '../../log/index.ts';
import { sanitizedExec } from './exec.ts';
import {
  CI_WORKSPACE_PATH,
  GIT_BRANCH,
  GIT_COMMIT_AUTHOR_DATE,
  GIT_COMMIT_AUTHOR_EMAIL,
  GIT_COMMIT_AUTHOR_NAME,
  GIT_COMMIT_COMMITTER_DATE,
  GIT_COMMIT_COMMITTER_EMAIL,
  GIT_COMMIT_COMMITTER_NAME,
  GIT_COMMIT_MESSAGE,
  GIT_COMMIT_SHA,
  GIT_REPOSITORY_URL,
  GIT_TAG,
} from './tags.ts';

const GIT_REV_LIST_MAX_BUFFER = 8 * 1024 * 1024; // 8MB

function isDirectory(path) {
  try {
    return Deno.statSync(path).isDirectory;
  } catch (e) {
    return false;
  }
}

function isShallowRepository() {
  return sanitizedExec('git', ['rev-parse', '--is-shallow-repository']) === 'true';
}

function getGitVersion() {
  const gitVersionString = sanitizedExec('git', ['version']);
  const gitVersionMatches = gitVersionString.match(/git version (\d+)\.(\d+)\.(\d+)/);
  try {
    return {
      major: parseInt(gitVersionMatches[1]),
      minor: parseInt(gitVersionMatches[2]),
      patch: parseInt(gitVersionMatches[3]),
    };
  } catch (e) {
    return null;
  }
}

function unshallowRepository() {
  const gitVersion = getGitVersion();
  if (!gitVersion) {
    log.warn('Git version could not be extracted, so git unshallow will not proceed');
    return;
  }
  if (gitVersion.major < 2 || (gitVersion.major === 2 && gitVersion.minor < 27)) {
    log.warn('Git version is <2.27, so git unshallow will not proceed');
    return;
  }
  const defaultRemoteName = sanitizedExec('git', ['config', '--default', 'origin', '--get', 'clone.defaultRemoteName']);
  const revParseHead = sanitizedExec('git', ['rev-parse', 'HEAD']);
  sanitizedExec('git', [
    'fetch',
    '--shallow-since="1 month ago"',
    '--update-shallow',
    '--filter=blob:none',
    '--recurse-submodules=no',
    defaultRemoteName,
    revParseHead,
  ]);
}

function getRepositoryUrl() {
  return sanitizedExec('git', ['config', '--get', 'remote.origin.url']);
}

function getLatestCommits() {
  try {
    return execFileSync('git', ['log', '--format=%H', '-n 1000', '--since="1 month ago"'], { stdio: 'pipe' })
      .toString()
      .split('\n')
      .filter((commit) => commit);
  } catch (err) {
    log.error(`Get latest commits failed: ${err.message}`);
    return [];
  }
}

function getCommitsToUpload(commitsToExclude: any[], commitsToInclude) {
  const commitsToExcludeString = commitsToExclude.map((commit) => `^${commit}`);

  try {
    return execFileSync(
      'git',
      [
        'rev-list',
        '--objects',
        '--no-object-names',
        '--filter=blob:none',
        '--since="1 month ago"',
        ...commitsToExcludeString,
        ...commitsToInclude,
      ],
      { stdio: 'pipe', maxBuffer: GIT_REV_LIST_MAX_BUFFER },
    )
      .toString()
      .split('\n')
      .filter((commit) => commit);
  } catch (err) {
    log.error(`Get commits to upload failed: ${err.message}`);
    return [];
  }
}

function generatePackFilesForCommits(commitsToUpload: any[]) {
  const tmpFolder = Deno.makeTempDirSync();

  if (!isDirectory(tmpFolder)) {
    log.error(new Error('Provided path to generate packfiles is not a directory'));
    return [];
  }

  const randomPrefix = String(Math.floor(Math.random() * 10000));
  const temporaryPath = join(tmpFolder, randomPrefix);
  const cwdPath = join(Deno.cwd(), randomPrefix);

  // Generates pack files to upload and
  // returns the ordered list of packfiles' paths

  function execGitPackObjects(targetPath) {
    return execFileSync(
      'git',
      [
        'pack-objects',
        '--compression=9',
        '--max-pack-size=3m',
        targetPath,
      ],
      { stdio: 'pipe', input: commitsToUpload.join('\n') },
    ).toString().split('\n').filter((commit) => commit).map((commit) => `${targetPath}-${commit}.pack`);
  }

  try {
    return execGitPackObjects(temporaryPath);
  } catch (err) {
    log.error(err);
    /**
     * The generation of pack files in the temporary folder (from `os.tmpdir()`)
     * sometimes fails in certain CI setups with the error message
     * `unable to rename temporary pack file: Invalid cross-device link`.
     * The reason why is unclear.
     *
     * A workaround is to attempt to generate the pack files in `Deno.cwd()`.
     * While this works most of the times, it's not ideal since it affects the git status.
     * This workaround is intended to be temporary.
     *
     * TODO: fix issue and remove workaround.
     */
    try {
      return execGitPackObjects(cwdPath);
    } catch (err) {
      log.error(err);
    }

    return [];
  }
}

// If there is ciMetadata, it takes precedence.
function getGitMetadata(
  ciMetadata: {
    commitSHA: any;
    branch: any;
    repositoryUrl: any;
    tag: any;
    commitMessage: any;
    authorName: any;
    authorEmail: any;
    ciWorkspacePath: any;
  },
) {
  const {
    commitSHA,
    branch,
    repositoryUrl,
    tag,
    commitMessage,
    authorName: ciAuthorName,
    authorEmail: ciAuthorEmail,
    ciWorkspacePath,
  } = ciMetadata;

  // With stdio: 'pipe', errors in this command will not be output to the parent process,
  // so if `git` is not present in the env, we won't show a warning to the user.
  const [
    authorName,
    authorEmail,
    authorDate,
    committerName,
    committerEmail,
    committerDate,
  ] = sanitizedExec('git', ['show', '-s', '--format=%an,%ae,%aI,%cn,%ce,%cI']).split(',');

  return {
    [GIT_REPOSITORY_URL]: repositoryUrl || sanitizedExec('git', ['ls-remote', '--get-url']),
    [GIT_COMMIT_MESSAGE]: commitMessage || sanitizedExec('git', ['show', '-s', '--format=%s']),
    [GIT_COMMIT_AUTHOR_DATE]: authorDate,
    [GIT_COMMIT_AUTHOR_NAME]: ciAuthorName || authorName,
    [GIT_COMMIT_AUTHOR_EMAIL]: ciAuthorEmail || authorEmail,
    [GIT_COMMIT_COMMITTER_DATE]: committerDate,
    [GIT_COMMIT_COMMITTER_NAME]: committerName,
    [GIT_COMMIT_COMMITTER_EMAIL]: committerEmail,
    [GIT_BRANCH]: branch || sanitizedExec('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    [GIT_COMMIT_SHA]: commitSHA || sanitizedExec('git', ['rev-parse', 'HEAD']),
    [GIT_TAG]: tag,
    [CI_WORKSPACE_PATH]: ciWorkspacePath || sanitizedExec('git', ['rev-parse', '--show-toplevel']),
  };
}

export {
  generatePackFilesForCommits,
  getCommitsToUpload,
  getGitMetadata,
  getLatestCommits,
  getRepositoryUrl,
  GIT_REV_LIST_MAX_BUFFER,
  isShallowRepository,
  unshallowRepository,
};
