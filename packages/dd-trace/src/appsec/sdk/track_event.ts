import log from '../../log/index.ts';
import { getRootSpan } from './utils.ts';
import * as tags from 'https://esm.sh/dd-trace@4.13.1&pin=v135&no-dts/ext/tags.js';
const { MANUAL_KEEP } = tags;
import { setUserTags } from './set_user.ts';
import { IAppsecMetadata, ITracer, User } from '../../interfaces.ts';

function trackUserLoginSuccessEvent(
  tracer: ITracer,
  user: User,
  metadata?: IAppsecMetadata,
) {
  // TODO: better user check here and in _setUser() ?
  if (!user || !user.id) {
    log.warn('Invalid user provided to trackUserLoginSuccessEvent');
    return;
  }

  const rootSpan = getRootSpan(tracer);
  if (!rootSpan) {
    log.warn('Root span not available in trackUserLoginSuccessEvent');
    return;
  }

  setUserTags(user, rootSpan);

  trackEvent('users.login.success', metadata, 'trackUserLoginSuccessEvent', rootSpan, 'sdk');
}

function trackUserLoginFailureEvent(
  tracer: ITracer,
  userId: string,
  exists: boolean,
  metadata?: IAppsecMetadata,
) {
  if (!userId || typeof userId !== 'string') {
    log.warn('Invalid userId provided to trackUserLoginFailureEvent');
    return;
  }

  const fields = {
    'usr.id': userId,
    'usr.exists': exists ? 'true' : 'false',
    ...metadata,
  };

  trackEvent('users.login.failure', fields, 'trackUserLoginFailureEvent', getRootSpan(tracer), 'sdk');
}

function trackCustomEvent(
  tracer: ITracer,
  eventName: string,
  metadata?: IAppsecMetadata,
) {
  if (!eventName || typeof eventName !== 'string') {
    log.warn('Invalid eventName provided to trackCustomEvent');
    return;
  }

  trackEvent(eventName, metadata ?? {}, 'trackCustomEvent', getRootSpan(tracer), 'sdk');
}

function trackEvent(
  eventName: string,
  fields: IAppsecMetadata,
  sdkMethodName: string,
  rootSpan: { addTags: (arg0: { [x: string]: string; [x: number]: string }) => void },
  mode: string,
) {
  if (!rootSpan) {
    log.warn(`Root span not available in ${sdkMethodName}`);
    return;
  }

  const tags = {
    [`appsec.events.${eventName}.track`]: 'true',
    [MANUAL_KEEP]: 'true',
  };

  if (mode === 'sdk') {
    tags[`_dd.appsec.events.${eventName}.sdk`] = 'true';
  }

  if (mode === 'safe' || mode === 'extended') {
    tags[`_dd.appsec.events.${eventName}.auto.mode`] = mode;
  }

  if (fields) {
    for (const metadataKey of Object.keys(fields)) {
      tags[`appsec.events.${eventName}.${metadataKey}`] = '' + fields[metadataKey];
    }
  }

  rootSpan.addTags(tags);
}

export { trackCustomEvent, trackEvent, trackUserLoginFailureEvent, trackUserLoginSuccessEvent };
