// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
import promise_mod = require('es6-promise');
import getopt = require('node-getopt');
var Promise = promise_mod.Promise;

class ArgParser {
    private _options: string[][] = [];
    private _promises: {[key: string]: Promise<any>} = {};
    private _defaults: {[key: string]: any} = {};
    private _resolutions: {[key: string]: (...args: any[]) => any} = {};
    private _parsed: boolean = false;

    /**
     * Registers a commandline argument.
     */
    public register(name: string, help: string='', alias: string='', default_value: any=undefined): Promise<any> {
        if (this._parsed) {
            throw new Error('Cannot register a config argument after config.parser.parse()');
        }
        this._options.push([alias, name, help]);
        var name_left = name.split('=')[0];
        var promise = new Promise((resolve, reject) => {
            this._resolutions[name_left] = resolve;
        });
        this._promises[name_left] = promise;
        this._defaults[name_left] = default_value;
        return promise;
    };

    /**
     * Process the commandline arguments for the registered
     * arguments.
     */
    public parse(): void {
        if (!this._parsed) {
            // Parse the commandline
            var opt: any = getopt.create(this._options).bindHelp().parseSystem()['options'];
            this._parsed = true;

            for (var i: number = 0; i < this._options.length; i++) {
                var name: string = this._options[i][1].split('=')[0];
                var resolve = this._resolutions[name];
                if (opt[name] === undefined) {
                    resolve(this._defaults[name]);
                } else {
                    resolve(opt[name]);
                }
            }
        }
    }
}

export var parser = new ArgParser();
