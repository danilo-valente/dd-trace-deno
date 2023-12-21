'use strict';

import v8 from 'node:v8';
import { AsyncLocalStorage, createHook } from 'node:async_hooks';
import dc from 'node:diagnostics_channel';

const beforeCh = dc.channel('dd-trace:storage:before');
const afterCh = dc.channel('dd-trace:storage:after');
const enterCh = dc.channel('dd-trace:storage:enter');

let PrivateSymbol = Symbol;
function makePrivateSymbol() {
  // eslint-disable-next-line no-new-func
  PrivateSymbol = new Function('name', 'return %CreatePrivateSymbol(name)');
}

try {
  makePrivateSymbol();
} catch (e) {
  try {
    v8.setFlagsFromString('--allow-natives-syntax');
    makePrivateSymbol();
    v8.setFlagsFromString('--no-allow-natives-syntax');
    // eslint-disable-next-line no-empty
  } catch (e) {}
}

export default abstract class AsyncResourceStorage {
  #storage = new AsyncLocalStorage();
  private _ddResourceStore: any;
  private _enabled: boolean;
  private _hook: any;
  constructor() {
    this._ddResourceStore = PrivateSymbol('ddResourceStore');
    this._enabled = false;
    this._hook = createHook(this._createHook());
  }

  disable() {
    if (!this._enabled) return;

    this._hook.disable();
    this._enabled = false;
  }

  getStore() {
    if (!this._enabled) return;

    const resource = this._executionAsyncResource();

    return resource[this._ddResourceStore];
  }

  enterWith(store) {
    this._enable();

    const resource = this._executionAsyncResource();

    resource[this._ddResourceStore] = store;
    enterCh.publish();
  }

  run(store, callback: (arg0: any) => any, ...args: any[]) {
    this._enable();

    const resource = this._executionAsyncResource();
    const oldStore = resource[this._ddResourceStore];

    resource[this._ddResourceStore] = store;
    enterCh.publish();

    try {
      return callback(...args);
    } finally {
      resource[this._ddResourceStore] = oldStore;
      enterCh.publish();
    }
  }

  _createHook() {
    return {
      init: this._init.bind(this),
      before() {
        beforeCh.publish();
      },
      after() {
        afterCh.publish();
      },
    };
  }

  _enable() {
    if (this._enabled) return;

    this._enabled = true;
    this._hook.enable();
  }

  _init(asyncId, type, triggerAsyncId, resource: { [x: string]: any }) {
    const currentResource = this._executionAsyncResource();

    if (Object.prototype.hasOwnProperty.call(currentResource, this._ddResourceStore)) {
      resource[this._ddResourceStore] = currentResource[this._ddResourceStore];
    }
  }

  // FIXME: executionAsyncResource is not available in Deno
  abstract _executionAsyncResource();
}
