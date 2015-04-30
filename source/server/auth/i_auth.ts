// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../typings/tsd.d.ts" />
import http = require('http');
export interface IAuth {

    /**
     * Is the user authenticated?
     */
    authenticated(request: http.IncomingMessage): Promise<boolean>;
}
