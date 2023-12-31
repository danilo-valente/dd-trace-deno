import { normalizeSpan, truncateSpan } from './tags-processors.ts';
import { AgentEncoder } from './0.4.ts';
import packageJson from '../../../../package.json.ts';
import id from '../../../dd-trace/src/id.ts';
const ENCODING_VERSION = 1;

const ALLOWED_CONTENT_TYPES = ['test_session_end', 'test_module_end', 'test_suite_end', 'test'];

const TEST_SUITE_KEYS_LENGTH = 12;
const TEST_MODULE_KEYS_LENGTH = 11;
const TEST_SESSION_KEYS_LENGTH = 10;

const INTAKE_SOFT_LIMIT = 2 * 1024 * 1024; // 2MB

function formatSpan(span: { type?: any; meta: any; resource?: string | any[]; metrics?: { [x: string]: any } }) {
  let encodingVersion = ENCODING_VERSION;
  if (span.type === 'test' && span.meta && span.meta.test_session_id) {
    encodingVersion = 2;
  }
  return {
    type: ALLOWED_CONTENT_TYPES.includes(span.type) ? span.type : 'span',
    version: encodingVersion,

    content: normalizeSpan(truncateSpan(span)),
  };
}

class AgentlessCiVisibilityEncoder extends AgentEncoder {
  runtimeId: any;
  service: any;
  env: any;
  private _eventCount: number;
  private _eventsOffset: any;

  constructor(writer: this, { runtimeId, service, env }: { runtimeId: any; env: any; service: any }) {
    super(writer, INTAKE_SOFT_LIMIT);
    this.runtimeId = runtimeId;
    this.service = service;
    this.env = env;

    // Used to keep track of the number of encoded events to update the
    // length of `payload.events` when calling `makePayload`
    this._eventCount = 0;

    this.reset();
  }

  _encodeTestSuite(
    bytes: {
      length: number;
      reserve: ((arg0: number) => void) | ((arg0: number) => void);
      buffer: { [x: string]: number };
    },
    content: {
      type: any;
      trace_id: any;
      parent_id: any;
      span_id: any;
      error: any;
      name: any;
      service: any;
      resource: any;
      start: any;
      duration: any;
      meta: any;
      metrics: any;
    },
  ) {
    this._encodeMapPrefix(bytes, TEST_SUITE_KEYS_LENGTH);

    this._encodeString(bytes, 'type');

    this._encodeString(bytes, content.type);

    this._encodeString(bytes, 'test_session_id');

    this._encodeId(bytes, content.trace_id);

    this._encodeString(bytes, 'test_module_id');

    this._encodeId(bytes, content.parent_id);

    this._encodeString(bytes, 'test_suite_id');

    this._encodeId(bytes, content.span_id);

    this._encodeString(bytes, 'error');
    this._encodeNumber(bytes, content.error);

    this._encodeString(bytes, 'name');

    this._encodeString(bytes, content.name);

    this._encodeString(bytes, 'service');

    this._encodeString(bytes, content.service);

    this._encodeString(bytes, 'resource');

    this._encodeString(bytes, content.resource);

    this._encodeString(bytes, 'start');
    this._encodeNumber(bytes, content.start);

    this._encodeString(bytes, 'duration');
    this._encodeNumber(bytes, content.duration);

    this._encodeString(bytes, 'meta');

    this._encodeMap(bytes, content.meta);

    this._encodeString(bytes, 'metrics');

    this._encodeMap(bytes, content.metrics);
  }

  _encodeTestModule(
    bytes: {
      length: number;
      reserve: ((arg0: number) => void) | ((arg0: number) => void);
      buffer: { [x: string]: number };
    },
    content: {
      type: any;
      trace_id: any;
      span_id: any;
      error: any;
      name: any;
      service: any;
      resource: any;
      start: any;
      duration: any;
      meta: any;
      metrics: any;
    },
  ) {
    this._encodeMapPrefix(bytes, TEST_MODULE_KEYS_LENGTH);

    this._encodeString(bytes, 'type');

    this._encodeString(bytes, content.type);

    this._encodeString(bytes, 'test_session_id');

    this._encodeId(bytes, content.trace_id);

    this._encodeString(bytes, 'test_module_id');

    this._encodeId(bytes, content.span_id);

    this._encodeString(bytes, 'error');
    this._encodeNumber(bytes, content.error);

    this._encodeString(bytes, 'name');

    this._encodeString(bytes, content.name);

    this._encodeString(bytes, 'service');

    this._encodeString(bytes, content.service);

    this._encodeString(bytes, 'resource');

    this._encodeString(bytes, content.resource);

    this._encodeString(bytes, 'start');
    this._encodeNumber(bytes, content.start);

    this._encodeString(bytes, 'duration');
    this._encodeNumber(bytes, content.duration);

    this._encodeString(bytes, 'meta');

    this._encodeMap(bytes, content.meta);

    this._encodeString(bytes, 'metrics');

    this._encodeMap(bytes, content.metrics);
  }

  _encodeTestSession(
    bytes: {
      length: number;
      reserve: ((arg0: number) => void) | ((arg0: number) => void);
      buffer: { [x: string]: number };
    },
    content: {
      type: any;
      trace_id: any;
      error: any;
      name: any;
      service: any;
      resource: any;
      start: any;
      duration: any;
      meta: any;
      metrics: any;
    },
  ) {
    this._encodeMapPrefix(bytes, TEST_SESSION_KEYS_LENGTH);

    this._encodeString(bytes, 'type');

    this._encodeString(bytes, content.type);

    this._encodeString(bytes, 'test_session_id');

    this._encodeId(bytes, content.trace_id);

    this._encodeString(bytes, 'error');
    this._encodeNumber(bytes, content.error);

    this._encodeString(bytes, 'name');

    this._encodeString(bytes, content.name);

    this._encodeString(bytes, 'service');

    this._encodeString(bytes, content.service);

    this._encodeString(bytes, 'resource');

    this._encodeString(bytes, content.resource);

    this._encodeString(bytes, 'start');
    this._encodeNumber(bytes, content.start);

    this._encodeString(bytes, 'duration');
    this._encodeNumber(bytes, content.duration);

    this._encodeString(bytes, 'meta');

    this._encodeMap(bytes, content.meta);

    this._encodeString(bytes, 'metrics');

    this._encodeMap(bytes, content.metrics);
  }

  _encodeEventContent(
    bytes: {
      length: number;
      reserve: ((arg0: number) => void) | ((arg0: number) => void);
      buffer: { [x: string]: number };
    },
    content: object,
  ) {
    const keysLength = Object.keys(content).length;

    let totalKeysLength = keysLength;

    if (content.meta.test_session_id) {
      totalKeysLength = totalKeysLength + 1;
    }

    if (content.meta.test_module_id) {
      totalKeysLength = totalKeysLength + 1;
    }

    if (content.meta.test_suite_id) {
      totalKeysLength = totalKeysLength + 1;
    }

    this._encodeMapPrefix(bytes, totalKeysLength);

    if (content.type) {
      this._encodeString(bytes, 'type');

      this._encodeString(bytes, content.type);
    }

    this._encodeString(bytes, 'trace_id');

    this._encodeId(bytes, content.trace_id);

    this._encodeString(bytes, 'span_id');

    this._encodeId(bytes, content.span_id);

    this._encodeString(bytes, 'parent_id');

    this._encodeId(bytes, content.parent_id);

    this._encodeString(bytes, 'name');

    this._encodeString(bytes, content.name);

    this._encodeString(bytes, 'resource');

    this._encodeString(bytes, content.resource);

    this._encodeString(bytes, 'service');

    this._encodeString(bytes, content.service);

    this._encodeString(bytes, 'error');

    this._encodeNumber(bytes, content.error);

    this._encodeString(bytes, 'start');

    this._encodeNumber(bytes, content.start);

    this._encodeString(bytes, 'duration');

    this._encodeNumber(bytes, content.duration);
    /**
     * We include `test_session_id` and `test_suite_id`
     * in the root of the event by passing them via the `meta` dict.
     * This is to avoid changing the span format in packages/dd-trace/src/format.js,
     * which can have undesired side effects in other products.
     * But `test_session_id` and `test_suite_id` are *not* supposed to be in `meta`,
     * so we delete them before enconding the dictionary.
     * TODO: find a better way to do this.
     */

    if (content.meta.test_session_id) {
      this._encodeString(bytes, 'test_session_id');

      this._encodeId(bytes, id(content.meta.test_session_id, 10));

      delete content.meta.test_session_id;
    }

    if (content.meta.test_module_id) {
      this._encodeString(bytes, 'test_module_id');

      this._encodeId(bytes, id(content.meta.test_module_id, 10));

      delete content.meta.test_module_id;
    }

    if (content.meta.test_suite_id) {
      this._encodeString(bytes, 'test_suite_id');

      this._encodeId(bytes, id(content.meta.test_suite_id, 10));

      delete content.meta.test_suite_id;
    }

    this._encodeString(bytes, 'meta');

    this._encodeMap(bytes, content.meta);

    this._encodeString(bytes, 'metrics');

    this._encodeMap(bytes, content.metrics);
  }

  _encodeEvent(
    bytes: {
      length: number;
      reserve: ((arg0: number) => void) | ((arg0: number) => void);
      buffer?: { [x: string]: number };
    },
    event: object,
  ) {
    this._encodeMapPrefix(bytes, Object.keys(event).length);

    this._encodeString(bytes, 'type');

    this._encodeString(bytes, event.type);

    this._encodeString(bytes, 'version');

    this._encodeNumber(bytes, event.version);

    this._encodeString(bytes, 'content');

    if (event.type === 'span' || event.type === 'test') {
      this._encodeEventContent(bytes, event.content);
    } else if (event.type === 'test_suite_end') {
      this._encodeTestSuite(bytes, event.content);
    } else if (event.type === 'test_module_end') {
      this._encodeTestModule(bytes, event.content);
    } else if (event.type === 'test_session_end') {
      this._encodeTestSession(bytes, event.content);
    }
  }

  _encodeNumber(
    bytes: {
      length: number;
      reserve: ((arg0: number) => void) | ((arg0: number) => void);
      buffer?: { [x: string]: number };
    },
    value: number,
  ) {
    if (Math.floor(value) !== value) { // float 64
      return this._encodeFloat(bytes, value);
    }

    return this._encodeLong(bytes, value);
  }

  _encodeLong(
    bytes: { length: number; reserve: (arg0: number) => void; buffer: { [x: string]: number } },
    value: number,
  ) {
    const isPositive = value >= 0;

    const hi = isPositive ? (value / Math.pow(2, 32)) >> 0 : Math.floor(value / Math.pow(2, 32));
    const lo = value >>> 0;
    const flag = isPositive ? 0xcf : 0xd3;

    const offset = bytes.length;

    // int 64
    bytes.reserve(9);
    bytes.length += 9;

    bytes.buffer[offset] = flag;
    bytes.buffer[offset + 1] = hi >> 24;
    bytes.buffer[offset + 2] = hi >> 16;
    bytes.buffer[offset + 3] = hi >> 8;
    bytes.buffer[offset + 4] = hi;
    bytes.buffer[offset + 5] = lo >> 24;
    bytes.buffer[offset + 6] = lo >> 16;
    bytes.buffer[offset + 7] = lo >> 8;
    bytes.buffer[offset + 8] = lo;
  }

  _encode(
    bytes: {
      length: number;
      reserve: ((arg0: number) => void) | ((arg0: number) => void);
      buffer?: { [x: string]: number };
    },
    trace: any[],
  ) {
    const rawEvents = trace.map(formatSpan);

    const testSessionEvents = rawEvents.filter(
      (event: { type: string }) =>
        event.type === 'test_session_end' || event.type === 'test_suite_end' || event.type === 'test_module_end',
    );

    const isTestSessionTrace = !!testSessionEvents.length;
    const events = isTestSessionTrace ? testSessionEvents : rawEvents;

    this._eventCount += events.length;

    for (const event of events) {
      this._encodeEvent(bytes, event);
    }
  }

  makePayload() {
    const bytes = this._traceBytes;
    const eventsOffset = this._eventsOffset;
    const eventsCount = this._eventCount;

    bytes.buffer[eventsOffset] = 0xdd;
    bytes.buffer[eventsOffset + 1] = eventsCount >> 24;
    bytes.buffer[eventsOffset + 2] = eventsCount >> 16;
    bytes.buffer[eventsOffset + 3] = eventsCount >> 8;
    bytes.buffer[eventsOffset + 4] = eventsCount;

    const traceSize = bytes.length;

    const buffer = Buffer.allocUnsafe(traceSize);

    bytes.buffer.copy(buffer, 0, 0, traceSize);

    this.reset();

    return buffer;
  }

  _encodePayloadStart(bytes: { length: number; reserve: (arg0: number) => void }) {
    // encodes the payload up to `events`. `events` will be encoded via _encode
    const payload = {
      version: ENCODING_VERSION,
      metadata: {
        '*': {
          'language': 'typescript',
          'library_version': packageJson.version,
        },
      },

      events: [],
    };

    if (this.env) {
      payload.metadata['*'].env = this.env;
    }
    if (this.runtimeId) {
      payload.metadata['*']['runtime-id'] = this.runtimeId;
    }

    this._encodeMapPrefix(bytes, Object.keys(payload).length);

    this._encodeString(bytes, 'version');
    this._encodeNumber(bytes, payload.version);

    this._encodeString(bytes, 'metadata');

    this._encodeMapPrefix(bytes, Object.keys(payload.metadata).length);

    this._encodeString(bytes, '*');

    this._encodeMap(bytes, payload.metadata['*']);

    this._encodeString(bytes, 'events');
    // Get offset of the events list to update the length of the array when calling `makePayload`
    this._eventsOffset = bytes.length;
    bytes.reserve(5);
    bytes.length += 5;
  }

  reset() {
    this._reset();
    this._eventCount = 0;

    this._encodePayloadStart(this._traceBytes);
  }
}

export { AgentlessCiVisibilityEncoder };
