// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
import mongo = require("./mongo");
import requests = require("./requests");
import chalk = require('chalk');
import i_auth = require("./auth/i_auth");
import http = require("http"); // Types only
import promise_mod = require('es6-promise');
var Promise = promise_mod.Promise;

export class API {
    private _mongo: mongo.Mongo;
    private _auth: i_auth.IAuth;

    public constructor(auth: i_auth.IAuth) {
        this._auth = auth;
        this._mongo = new mongo.Mongo();
    }

    /**
     * Returns the Date.now() of the server.
     */
    public ping(request: http.IncomingMessage): Promise<string> {
        this._log_http(request, 'ping');
        return this._mongo.get_db().then(db => String(Date.now()));
    }

    /**
     * Echos a JSON representation the request as recieved by the server.
     */
    public echo(request: http.IncomingMessage): Promise<string> {
        this._log_http(request, 'echo');
        return Promise.resolve(JSON.stringify({
            headers: request.headers,
            method: request.method,
            url: request.url,
            parsed_url: requests.parse_url(request),
            params: requests.get_params(request)
        }, null, 2));
    }

    /**
     * Check if this client is autheticated.
     */
    public auth(request: http.IncomingMessage): Promise<any> {
        this._log_http(request, 'auth');
        return this._auth.authenticated(request).then(valid => {
            return valid ? 'yes' : 'no';
        });
    }

    /**
     * Registers a client with the server.
     */
    public client(request: http.IncomingMessage): Promise<any> {
        return this._auth.authenticated(request).then((valid: boolean): Promise<any> => { 
            if (!valid) return Promise.resolve('ok');

            return requests.get_payload(request).then(data => {
                var params = JSON.parse(data);
                // id, opt_in, sex
                this._log_http(request, 'client', chalk.yellow(params.id));
                return this._mongo.db_find('clients', { id: params.id }).then(clients => {
                    if (clients.length > 0) {
                        this._log_http(request, 'client', 'exists');
                        return 'ok';
                    } else {
                        this._log_http(request, 'client', 'inserted');
                        return this._mongo.db_insert('clients', {
                            id: params.id,
                            sex: params.sex,
                        }).then(()=>'ok');
                    }
                }).catch(err=>this._log(chalk.bgRed(String(err))));
            });
        });
    }

    /**
     * Registers columns in the server for an event type.
     */
    public register(request: http.IncomingMessage): Promise<string> {
        return this._auth.authenticated(request).then((valid: boolean): Promise<any> => {
            if (!valid) return Promise.resolve('ok');

            return requests.get_payload(request).then(data => {
                var params = JSON.parse(data);
                this._log_http(request, 'register', JSON.stringify(params));
                return this._mongo.get_db().then(db => {
                    return 'ok';
                });
            });
        });
    }

    /**
     * Record a client event.
     */
    public entry(request: http.IncomingMessage): Promise<any> {
        return this._auth.authenticated(request).then((valid: boolean): Promise<any> => {
            if (!valid) return Promise.resolve('ok');

            return requests.get_payload(request).then(data => {
                var params = JSON.parse(data);
                this._log_http(request, params.entry.timestamp, 'entry', params.entry_type, params.entry.event_name)//, params.entry.element_selector);
                return this._mongo.db_insert(params.entry_type, params.entry)
                    .then(()=>'ok');
            });
        });
    }

    private _log(...args: any[]): void {
        console.log(chalk.grey('client'), ...args);
    }

    private _log_http(request: http.IncomingMessage, method: string, ...args: any[]): void {
        this._log(
            chalk.grey(request.socket.remoteAddress), 
            chalk.cyan(request.method), 
            chalk.green(method), 
            ...args);
    }
}
