/* eslint-disable security/detect-unsafe-regex */
/* eslint-disable consistent-return */
/* eslint-disable no-console */
/* eslint-disable security/detect-object-injection */
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable require-jsdoc */
/* eslint-disable global-require */
/* eslint-disable security/detect-non-literal-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable array-callback-return */
/* eslint-disable func-names */
const fs = require('fs');
const path = require('path');

const PLUGIN_REGEX = /^(?:@(.+)\/)?engine-plugin-.+$/;
const PLUGINS_PATH = 'plugins';
const REPOSITORIES_PATH = 'repositories';

function Plugins() {
  this._plugins = {};
  this.initPlugins();
}

Plugins.prototype.isPlugin = function (name) {
  return PLUGIN_REGEX.test(name);
};

Plugins.prototype.initPlugins = function () {
  const projectPath = path.resolve(process.cwd());
  const modulePath = path.join(projectPath, 'node_modules');
  const pluginsPath = path.join(projectPath, PLUGINS_PATH);
  const repositoriesPath = path.join(projectPath, REPOSITORIES_PATH);

  fs.readdirSync(modulePath).map((module) => {
    if (/^@/.test(module)) {
      return fs.readdirSync(path.join(modulePath, module)).map((subModule) => {
        if (this.isPlugin(subModule)) {
          const subModuleKey = path.join(module, subModule);
          const subModulePlugin = require(subModuleKey);
          this.set(subModuleKey, subModulePlugin);
        }
      });
    }
    if (this.isPlugin(module)) {
      const modulePlugin = require(module);
      this.set(module, modulePlugin);
    }
  });

  fs.readdirSync(pluginsPath)
    .filter(file => path.extname(file) === '.js')
    .map((file) => {
      const parsePath = path.parse(file);
      const pluginName = parsePath.name;
      this.set(`plugin://${pluginName}`, require(path.join(pluginsPath, file)));
    });

  fs.readdirSync(repositoriesPath)
    .filter(file => path.extname(file) === '.js')
    .map((file) => {
      const parsePath = path.parse(file);
      const pluginName = parsePath.name;
      this.set(`repository://${pluginName}`, require(path.join(repositoriesPath, file)));
    });
};

Plugins.prototype.set = function (key, plugin) {
  if (typeof plugin !== 'object') {
    throw new Error('Plugin must be an object');
  }

  if (this._plugins[key]) {
    throw new Error(`Duplicate plugin '${key}'`);
  }

  const keys = Object.keys(plugin);
  if (keys.indexOf('execute') === -1 || typeof plugin.execute !== 'function') {
    throw new Error('Plugin must be have export function execute');
  }

  if (keys.indexOf('category') === -1 || typeof plugin.category !== 'string') {
    throw new Error('Plugin must be have export string category');
  }

  if (keys.indexOf('parameters') === -1 || (typeof plugin.parameters !== 'object' && !Array.isArray(plugin.parameters))) {
    throw new Error('Plugin must be have export string parameters');
  }

  this._plugins = Object.assign(this._plugins, { [key]: plugin });
  console.log(`Register plugin ${key}`);
};

Plugins.prototype.get = function (key) {
  return this._plugins[key];
};

Plugins.prototype.all = function () {
  return this._plugins;
};

module.exports = Plugins;
