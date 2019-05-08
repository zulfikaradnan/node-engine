/* eslint-disable security/detect-object-injection */
/* eslint-disable no-param-reassign */
/* eslint-disable no-loop-func */
/* eslint-disable require-jsdoc */
/* eslint-disable no-restricted-syntax */
const Store = require('@zulfikaradnan/store');
const Plugins = require('./plugins');
const engine = require('./engine');

const CORE_RESPONSE = 'plugin://@zulfikaradnan/engine-plugin-response';

const plugins = new Plugins();

const getArguments = (params, dataStore) => {
  const args = params.map((param) => {
    let newParam;
    switch (param.type) {
      case 'context':
        if (param.value === '') {
          newParam = dataStore.all();
        } else {
          newParam = dataStore.get(param.value);
        }
        break;
      case 'string':
        newParam = String(param.value);
        break;
      case 'number':
        newParam = Number(param.value);
        break;
      case 'array':
        newParam = JSON.parse(JSON.stringify(param.value));
        break;
      case 'object':
        newParam = JSON.parse(JSON.stringify(param.value));
        break;
      default:
        newParam = undefined;
        break;
    }
    return newParam;
  });
  return args;
};

const execute = async (flow, input) => {
  const dataStore = new Store(input);
  return new Promise(async (resolve) => {
    const flowEngine = engine.create();
    const { start } = flow;
    const steps = Object.keys(flow.steps);
    for (const index of steps) {
      const step = flow.steps[index];
      flowEngine.addStep(index, async (instance, data) => {
        const { executor } = step;
        const output = step.output || {};
        const nextOut = output.next || {};
        const nextErr = output.error || {};

        if (!plugins.get(executor)) {
          resolve(plugins.get(CORE_RESPONSE).execute(500, 'Internal Server Error'));
        }

        try {
          const args = getArguments(step.parameters, dataStore);
          const result = await plugins.get(executor).execute(...args);
          if (nextOut.step) {
            dataStore.set(nextOut.context, result);
            data[nextOut.context] = result;
            instance.next(nextOut.step, data);
          } else if (executor === CORE_RESPONSE) {
            resolve(result);
          } else {
            resolve(plugins.get(CORE_RESPONSE).execute(200, 'Ok', result));
          }
        } catch (err) {
          if (nextErr.step) {
            dataStore.set(nextErr.context, err);
            data[nextErr.context] = err;
            instance.next(nextErr.step, data);
          } else {
            resolve(plugins.get(CORE_RESPONSE).execute(500, err.message, err));
          }
        }
      });
    }
    flowEngine.catchError((err) => {
      resolve(plugins.get(CORE_RESPONSE).execute(err.status, err.message, err));
    });
    flowEngine.execute(start, input);
  });
};

module.exports = {
  execute,
  plugins
};
