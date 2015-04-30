// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../typings/tsd.d.ts" />
import i_auth = require('./i_auth');
import http = require('http');
import promise_mod = require('es6-promise');
var Promise = promise_mod.Promise;

export class NoAuth implements i_auth.IAuth {
    /**
     * Is the user authenticated?
     */
    public authenticated(request: http.IncomingMessage): Promise<boolean> {
        return Promise.resolve(true);
    }
}
