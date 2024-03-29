import Span from './span.ts';
import SpanProcessor from '../span_processor.ts';
import PrioritySampler from '../priority_sampler.ts';
import TextMapPropagator from './propagation/text_map.ts';
import HttpPropagator from './propagation/http.ts';
import BinaryPropagator from './propagation/binary.ts';
import LogPropagator from './propagation/log.ts';
import * as formats from 'https://esm.sh/dd-trace@4.13.1&pin=v135&no-dts/ext/formats.js';

import log from '../log/index.ts';
import * as runtimeMetrics from '../runtime_metrics.ts';
import getExporter from '../exporter.ts';
import SpanContext from './span_context.ts';
import { ITracer } from '../interfaces.ts';

const REFERENCE_CHILD_OF = 'child_of';
const REFERENCE_FOLLOWS_FROM = 'follows_from';

export default class DatadogTracer implements ITracer {
  private _service: any;
  private _version: any;
  private _env: any;
  private _tags: any;
  protected _computePeerService: any;
  protected _peerServiceMapping: any;
  protected _logInjection: any;
  private _debug: any;
  private _prioritySampler: PrioritySampler;
  private _exporter: any;
  private _processor: SpanProcessor;
  protected _url: any;
  protected _enableGetRumData: any;
  private _traceId128BitGenerationEnabled: any;
  private _propagators: { [x: number]: any };
  private _hostname: any;
  constructor(
    config: {
      experimental: { exporter: any; enableGetRumData: any };
      service: any;
      version: any;
      env: any;
      tags: any;
      spanComputePeerService: any;
      peerServiceMapping: any;
      logInjection: any;
      debug: any;
      sampler: any;
      traceId128BitGenerationEnabled: any;
      reportHostname: any;
    },
  ) {
    const Exporter = getExporter(config.experimental.exporter);

    this._service = config.service;
    this._version = config.version;
    this._env = config.env;
    this._tags = config.tags;
    this._computePeerService = config.spanComputePeerService;
    this._peerServiceMapping = config.peerServiceMapping;
    this._logInjection = config.logInjection;
    this._debug = config.debug;
    this._prioritySampler = new PrioritySampler(config.env, config.sampler);
    this._exporter = new Exporter(config, this._prioritySampler);
    this._processor = new SpanProcessor(this._exporter, this._prioritySampler, config);
    this._url = this._exporter._url;
    this._enableGetRumData = config.experimental.enableGetRumData;
    this._traceId128BitGenerationEnabled = config.traceId128BitGenerationEnabled;
    this._propagators = {
      [formats.TEXT_MAP]: new TextMapPropagator(config),
      [formats.HTTP_HEADERS]: new HttpPropagator(config),
      [formats.BINARY]: new BinaryPropagator(config),
      [formats.LOG]: new LogPropagator(config),
    };
    if (config.reportHostname) {
      this._hostname = Deno.hostname();
    }
  }

  startSpan(name, options = {}) {
    const parent = options.childOf ? getContext(options.childOf) : getParent(options.references);

    const tags = {
      'service.name': this._service,
    };

    const span = new Span(this, this._processor, this._prioritySampler, {
      operationName: options.operationName || name,
      parent,
      tags,

      startTime: options.startTime,
      hostname: this._hostname,
      traceId128BitGenerationEnabled: this._traceId128BitGenerationEnabled,

      integrationName: options.integrationName,
    }, this._debug);

    span.addTags(this._tags);

    span.addTags(options.tags);

    return span;
  }

  inject(spanContext: { context: () => any }, format: string | number, carrier) {
    if (spanContext instanceof Span) {
      spanContext = spanContext.context();
    }

    try {
      this._prioritySampler.sample(spanContext);

      this._propagators[format].inject(spanContext, carrier);
    } catch (e) {
      log.error(e);
      runtimeMetrics.increment('datadog.tracer.deno.inject.errors', true);
    }
  }

  extract(format: string | number, carrier) {
    try {
      return this._propagators[format].extract(carrier);
    } catch (e) {
      log.error(e);
      runtimeMetrics.increment('datadog.tracer.deno.extract.errors', true);
      return null;
    }
  }
}

function getContext(spanContext: { context: () => any }) {
  if (spanContext instanceof Span) {
    spanContext = spanContext.context();
  }

  if (!(spanContext instanceof SpanContext)) {
    spanContext = null;
  }

  return spanContext;
}

function getParent(references = []) {
  let parent = null;

  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    const type = ref.type();

    if (type === REFERENCE_CHILD_OF) {
      parent = ref.referencedContext();
      break;
    } else if (type === REFERENCE_FOLLOWS_FROM) {
      if (!parent) {
        parent = ref.referencedContext();
      }
    }
  }

  return parent;
}
