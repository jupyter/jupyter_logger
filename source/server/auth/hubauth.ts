// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/cookies.d.ts" />
import noauth = require('./noauth');
import config = require("../config");
import http = require('http');
import querystring = require('querystring');
import chalk = require('chalk');
import cookies = require('cookies');
import promise_mod = require('es6-promise');
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

export class HubAuth extends noauth.NoAuth {
    private _url: string;
    private _cache: { [key: string]: string|boolean } = {};

    public constructor(port) {
        super();
        this._url = 'http://localhost:' + port + '/';
        this._register_redirect();
    }

    /**
     * Is the user authenticated?
     */
    public authenticated(request: http.IncomingMessage): Promise<boolean> {
        return hubapi_cookie.then((hubapi_cookie): Promise<boolean> => {
            var jar = new cookies(request);
            var cookie = jar.get(hubapi_cookie);
            // Remove quotes.
            cookie = cookie.substr(1, cookie.length - 2);
            
            if (this._cache[cookie] !== undefined) {
                if (this._cache[cookie]) {
                    this._log('Cache autheticated as ', this._cache[cookie]);
                    return Promise.resolve(true);
                }
            } else {
                var response = this._request(
                    hubapi_address,
                    hubapi_port,
                    hubapi_token,
                    '/hub/api/authorizations/cookie/' + hubapi_cookie + '/' + cookie,
                    'GET');

                return <Promise<boolean>><any>response.then((msg: http.IncomingMessage) => {
                    if (msg.statusCode === 200) {
                        this._log('Autheticated');
                        return new Promise((resolve, reject) => {
                            msg.setEncoding('utf8');
                            msg.on('data', chunk => {
                                var user: string = JSON.parse(chunk)['user'].trim();
                                this._log('Autheticated as ', user);
                                whitelist.then(whitelist => {
                                    if (whitelist.indexOf(user) === -1) {
                                        this._log('User ', user, ' not in whitelist');
                                        this._cache[cookie] = false;
                                        resolve(false);

                                    } else {
                                        this._log('User ', user, ' found in whitelist');
                                        this._cache[cookie] = user;
                                        resolve(true);
                                    }
                                });
                            });
                        });
                    } else {
                        this._log('Couldn\'t auntheticate.  HTTP status code ' + msg.statusCode);
                        return false;
                    }
                }).catch((e) => {
                    this._log('Error while trying to autheticate.');
                    console.error(e);
                });
            }
        });
    }

    /**
     * Registers this service behind jupyterhub.
     */
    private _register_redirect(): void {
        remap_url.then(remap_url => {
            var response = this._request(
                proxy_address, 
                proxy_port, 
                proxy_token, 
                '/api/routes/' + remap_url, 
                'POST', { 'target': this._url });

            response.then((msg: http.IncomingMessage) => {
                if (msg.statusCode===201) {
                    this._log('Successfully registered self as a hub service.');
                } else {
                    this._log('Couldn\'t registered self as a hub service.  HTTP status code ' + msg.statusCode);
                    process.abort();
                }
            }).catch((e) => {
                this._log('Error while trying to register self as a hub service.');
                console.error(e);
                process.abort();
            });
        });
    }

    /**
     * Make a request
     */
    private _request(address: any, port: any, token: any, path: string, method: string, body?: any): Promise<http.IncomingMessage> {
        return Promise.all([address, port, token]).then(values => {
            [address, port, token] = values;
            var resolve: (msg: http.IncomingMessage) => any;
            var reject: (...args: any[]) => any;
            var promise = new Promise<http.IncomingMessage>((a, b) => { resolve = a; reject = b; });


            var headers: any = {
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
            }, (response: http.IncomingMessage) => { resolve(response); });

            request.on('error', (e: any) => {
                reject(e);
            });

            if (body) {
                request.write(post_data);
            }
            request.end();

            return promise;
        });
    }

    private _log(...args: any[]): void {
        console.log(chalk.red('hubauth'), ...args);
    }
}
