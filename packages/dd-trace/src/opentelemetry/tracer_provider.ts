import { context, trace } from 'https://esm.sh/@opentelemetry/api@1.4.1';

import tracer from '../proxy.ts';

import ContextManager from './context_manager.ts';
import { MultiSpanProcessor, NoopSpanProcessor } from './span_processor.ts';
import Tracer from './tracer.ts';

class TracerProvider {
  config: {};
  resource: any;
  private _processors: any[];
  private _tracers: any;
  private _activeProcessor: any;
  private _contextManager: any;
  constructor(config = {}) {
    this.config = config;
    this.resource = config.resource;

    this._processors = [];
    this._tracers = new Map();
    this._activeProcessor = new NoopSpanProcessor();
    this._contextManager = new ContextManager();
  }

  getTracer(name = 'opentelemetry', version = '0.0.0', options) {
    const key = `${name}@${version}`;
    if (!this._tracers.has(key)) {
      this._tracers.set(
        key,
        new Tracer(
          { ...options, name, version },
          this.config,
          this,
        ),
      );
    }
    return this._tracers.get(key);
  }

  addSpanProcessor(spanProcessor) {
    if (!this._processors.length) {
      this._activeProcessor.shutdown();
    }
    this._processors.push(spanProcessor);
    this._activeProcessor = new MultiSpanProcessor(
      this._processors,
    );
  }

  getActiveSpanProcessor() {
    return this._activeProcessor;
  }

  // Not actually required by the SDK spec, but the official Node.js SDK does
  // this and the docs reflect that so we should do this too for familiarity.
  register(config = {}) {
    context.setGlobalContextManager(this._contextManager);
    if (!trace.setGlobalTracerProvider(this)) {
      trace.getTracerProvider().setDelegate(this);
    }
  }

  forceFlush() {
    const exporter = tracer._tracer._exporter;
    if (!exporter) {
      return Promise.reject(new Error('Not started'));
    }

    exporter._writer.flush();
    return this._activeProcessor.forceFlush();
  }

  shutdown() {
    return this._activeProcessor.shutdown();
  }
}

export default TracerProvider;
