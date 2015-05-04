#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/cookies.d.ts" />
var noauth = require('./noauth');
var config = require("../config");
var http = require('http');
var chalk = require('chalk');
var cookies = require('cookies');
var promise_mod = require('es6-promise');
var Promise = promise_mod.Promise;
var proxy_address = config.parser.register('proxy_address=ARG', 'Address of the configurable-http-proxy server', undefined, 'localhost');
var proxy_port = config.parser.register('proxy_port=ARG', 'Port of the configurable-http-proxy server', undefined, 8001);
var proxy_token = config.parser.register('proxy_token=ARG', 'Token for the configurable-http-proxy');
var hubapi_address = config.parser.register('hubapi_address=ARG', 'Address of the hubapi server', undefined, 'localhost');
var hubapi_port = config.parser.register('hubapi_port=ARG', 'Port of the hubapi server', undefined, 8081);
var hubapi_cookie = config.parser.register('hubapi_cookie=ARG', 'Name of the cookie used by JupyterHub', undefined, 'jupyter-hub-token');
var hubapi_token = config.parser.register('hubapi_token=ARG', 'Token for the hubapi');
var remap_url = config.parser.register('remap_url=ARG', 'Path which the user logging extension will access', undefined, 'hub/logger');
var whitelist = config.parser.register('whitelist=ARG+', 'Whitelist of users to log', undefined, []);
var HubAuth = (function (_super) {
    __extends(HubAuth, _super);
    function HubAuth(port) {
        _super.call(this);
        this._cache = {};
        this._url = 'http://localhost:' + port + '/';
        this._register_redirect();
    }
    /**
     * Is the user authenticated?
     */
    HubAuth.prototype.authenticated = function (request) {
        var _this = this;
        return hubapi_cookie.then(function (hubapi_cookie) {
            var jar = new cookies(request);
            var cookie = jar.get(hubapi_cookie);
            // Remove quotes.
            cookie = cookie.substr(1, cookie.length - 2);
            if (_this._cache[cookie] !== undefined) {
                if (_this._cache[cookie]) {
                    _this._log('Cache autheticated as ', _this._cache[cookie]);
                    return Promise.resolve(true);
                }
            }
            else {
                var response = _this._request(hubapi_address, hubapi_port, hubapi_token, '/hub/api/authorizations/cookie/' + hubapi_cookie + '/' + cookie, 'GET');
                return response.then(function (msg) {
                    if (msg.statusCode === 200) {
                        _this._log('Autheticated');
                        return new Promise(function (resolve, reject) {
                            msg.setEncoding('utf8');
                            msg.on('data', function (chunk) {
                                var user = JSON.parse(chunk)['user'].trim();
                                _this._log('Autheticated as ', user);
                                whitelist.then(function (whitelist) {
                                    if (whitelist.indexOf(user) === -1) {
                                        _this._log('User ', user, ' not in whitelist');
                                        _this._cache[cookie] = false;
                                        resolve(false);
                                    }
                                    else {
                                        _this._log('User ', user, ' found in whitelist');
                                        _this._cache[cookie] = user;
                                        resolve(true);
                                    }
                                });
                            });
                        });
                    }
                    else {
                        _this._log('Couldn\'t auntheticate.  HTTP status code ' + msg.statusCode);
                        return false;
                    }
                }).catch(function (e) {
                    _this._log('Error while trying to autheticate.');
                    console.error(e);
                });
            }
        });
    };
    /**
     * Registers this service behind jupyterhub.
     */
    HubAuth.prototype._register_redirect = function () {
        var _this = this;
        remap_url.then(function (remap_url) {
            var response = _this._request(proxy_address, proxy_port, proxy_token, '/api/routes/' + remap_url, 'POST', { 'target': _this._url });
            response.then(function (msg) {
                if (msg.statusCode === 201) {
                    _this._log('Successfully registered self as a hub service.');
                }
                else {
                    _this._log('Couldn\'t registered self as a hub service.  HTTP status code ' + msg.statusCode);
                    process.abort();
                }
            }).catch(function (e) {
                _this._log('Error while trying to register self as a hub service.');
                console.error(e);
                process.abort();
            });
        });
    };
    /**
     * Make a request
     */
    HubAuth.prototype._request = function (address, port, token, path, method, body) {
        return Promise.all([address, port, token]).then(function (values) {
            address = values[0], port = values[1], token = values[2];
            var resolve;
            var reject;
            var promise = new Promise(function (a, b) { resolve = a; reject = b; });
            var headers = {
                'Authorization': 'token ' + token
            };
            var post_data;
            if (body) {
                post_data = JSON.stringify(body);
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                headers['Content-Length'] = post_data.length;
            }
            var request = http.request({
                host: address,
                port: port,
                path: path,
                method: method,
                headers: headers
            }, function (response) { resolve(response); });
            request.on('error', function (e) {
                reject(e);
            });
            if (body) {
                request.write(post_data);
            }
            request.end();
            return promise;
        });
    };
    HubAuth.prototype._log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log.apply(console, [chalk.red('hubauth')].concat(args));
    };
    return HubAuth;
})(noauth.NoAuth);
exports.HubAuth = HubAuth;
