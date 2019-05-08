/* eslint-disable security/detect-object-injection */
/* eslint-disable no-plusplus */
/* eslint-disable require-jsdoc */
let flowIterator = 0;
const flowStorage = {};

function Engine() {
  this.id = 0;
  this._chain = [];
  this._catch = null;
  this._currentStep = 0;
}

Engine.prototype.addStep = function addStep(key, callback) {
  this._chain[key] = callback;
  return this;
};

Engine.prototype.catchError = function catchError(callback) {
  this._catch = callback;
  return this;
};

Engine.prototype.nextFrom = function nextFrom(key, data) {
  this._currentStep = key;
  this.next(key, data);
};

Engine.prototype.repeat = function repeat(data) {
  if (typeof this._chain[this._currentStep] !== 'undefined') {
    setImmediate((flow, xData) => {
      try {
        flow._chain[flow._currentStep](flow, xData);
      } catch (e) {
        if (flow._catch === null) {
          throw e;
        } else {
          flow._catch(e, xData);
        }
        module.exports.destroy(flow);
      }
    }, this, data);
  }
};

Engine.prototype.next = function next(key, data) {
  if (typeof this._chain[key] !== 'undefined') {
    this._currentStep = key;
    setImmediate((flow, xData) => {
      try {
        flow._chain[flow._currentStep](flow, xData);
      } catch (e) {
        if (flow._catch === null) {
          throw e;
        } else {
          flow._catch(e, xData);
        }
        module.exports.destroy(flow);
      }
    }, this, data);
  } else {
    module.exports.destroy(this);
  }
};

Engine.prototype.getStep = function getStep() {
  return this._currentStep;
};

Engine.prototype.throwError = function throwError(error, data) {
  const self = this;
  process.nextTick(() => {
    if (self._catch === null) {
      throw new Error(error.toString());
    } else {
      self._catch(new Error(error.toString()), data);
    }
    module.exports.destroy(self);
  });
};

Engine.prototype.execute = function execute(key, data) {
  this._currentStep = key;
  this.next(key, data);
  return this;
};

function create() {
  const iterator = ++flowIterator;
  flowStorage[iterator] = new Engine();
  flowStorage[iterator].id = iterator;
  return flowStorage[iterator];
}

function destroy(flow) {
  if (typeof flowStorage[flow.id] !== 'undefined') {
    delete flowStorage[flow.id];
  }
}

module.exports = {
  create,
  destroy
};
