#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/// <reference path="typings/tsd.d.ts" />
var promise_mod = require('es6-promise');
var getopt = require('node-getopt');
var Promise = promise_mod.Promise;
var ArgParser = (function () {
    function ArgParser() {
        this._options = [];
        this._promises = {};
        this._defaults = {};
        this._resolutions = {};
        this._parsed = false;
    }
    /**
     * Registers a commandline argument.
     */
    ArgParser.prototype.register = function (name, help, alias, default_value) {
        var _this = this;
        if (help === void 0) { help = ''; }
        if (alias === void 0) { alias = ''; }
        if (default_value === void 0) { default_value = undefined; }
        if (this._parsed) {
            throw new Error('Cannot register a config argument after config.parser.parse()');
        }
        this._options.push([alias, name, help]);
        var name_left = name.split('=')[0];
        var promise = new Promise(function (resolve, reject) {
            _this._resolutions[name_left] = resolve;
        });
        this._promises[name_left] = promise;
        this._defaults[name_left] = default_value;
        return promise;
    };
    ;
    /**
     * Process the commandline arguments for the registered
     * arguments.
     */
    ArgParser.prototype.parse = function () {
        if (!this._parsed) {
            // Parse the commandline
            var opt = getopt.create(this._options).bindHelp().parseSystem()['options'];
            this._parsed = true;
            for (var i = 0; i < this._options.length; i++) {
                var name = this._options[i][1].split('=')[0];
                var resolve = this._resolutions[name];
                if (opt[name] === undefined) {
                    resolve(this._defaults[name]);
                }
                else {
                    resolve(opt[name]);
                }
            }
        }
    };
    return ArgParser;
})();
exports.parser = new ArgParser();
