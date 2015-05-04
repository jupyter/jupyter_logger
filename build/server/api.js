#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/// <reference path="typings/tsd.d.ts" />
var mongo = require("./mongo");
var requests = require("./requests");
var chalk = require('chalk');
var promise_mod = require('es6-promise');
var Promise = promise_mod.Promise;
var API = (function () {
    function API(auth) {
        this._auth = auth;
        this._mongo = new mongo.Mongo();
    }
    /**
     * Returns the Date.now() of the server.
     */
    API.prototype.ping = function (request) {
        this._log_http(request, 'ping');
        return this._mongo.get_db().then(function (db) { return String(Date.now()); });
    };
    /**
     * Echos a JSON representation the request as recieved by the server.
     */
    API.prototype.echo = function (request) {
        this._log_http(request, 'echo');
        return Promise.resolve(JSON.stringify({
            headers: request.headers,
            method: request.method,
            url: request.url,
            parsed_url: requests.parse_url(request),
            params: requests.get_params(request)
        }, null, 2));
    };
    /**
     * Check if this client is autheticated.
     */
    API.prototype.auth = function (request) {
        this._log_http(request, 'auth');
        return this._auth.authenticated(request).then(function (valid) {
            return valid ? 'yes' : 'no';
        });
    };
    /**
     * Registers a client with the server.
     */
    API.prototype.client = function (request) {
        var _this = this;
        return this._auth.authenticated(request).then(function (valid) {
            if (!valid)
                return Promise.resolve('ok');
            return requests.get_payload(request).then(function (data) {
                var params = JSON.parse(data);
                // id, opt_in, sex
                _this._log_http(request, 'client', chalk.yellow(params.id));
                return _this._mongo.db_find('clients', { id: params.id }).then(function (clients) {
                    if (clients.length > 0) {
                        _this._log_http(request, 'client', 'exists');
                        return 'ok';
                    }
                    else {
                        _this._log_http(request, 'client', 'inserted');
                        return _this._mongo.db_insert('clients', {
                            id: params.id,
                            sex: params.sex,
                        }).then(function () { return 'ok'; });
                    }
                }).catch(function (err) { return _this._log(chalk.bgRed(String(err))); });
            });
        });
    };
    /**
     * Registers columns in the server for an event type.
     */
    API.prototype.register = function (request) {
        var _this = this;
        return this._auth.authenticated(request).then(function (valid) {
            if (!valid)
                return Promise.resolve('ok');
            return requests.get_payload(request).then(function (data) {
                var params = JSON.parse(data);
                _this._log_http(request, 'register', JSON.stringify(params));
                return _this._mongo.get_db().then(function (db) {
                    return 'ok';
                });
            });
        });
    };
    /**
     * Record a client event.
     */
    API.prototype.entry = function (request) {
        var _this = this;
        return this._auth.authenticated(request).then(function (valid) {
            if (!valid)
                return Promise.resolve('ok');
            return requests.get_payload(request).then(function (data) {
                var params = JSON.parse(data);
                _this._log_http(request, params.entry.timestamp, 'entry', params.entry_type, params.entry.event_name); //, params.entry.element_selector);
                return _this._mongo.db_insert(params.entry_type, params.entry)
                    .then(function () { return 'ok'; });
            });
        });
    };
    API.prototype._log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log.apply(console, [chalk.grey('client')].concat(args));
    };
    API.prototype._log_http = function (request, method) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        this._log.apply(this, [chalk.grey(request.socket.remoteAddress), chalk.cyan(request.method), chalk.green(method)].concat(args));
    };
    return API;
})();
exports.API = API;
