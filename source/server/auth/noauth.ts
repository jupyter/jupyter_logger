// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../typings/tsd.d.ts" />
import i_auth = require('./i_auth');

export class NoAuth implements i_auth.IAuth {

    /**
     * Is the user authenticated?
     */
    authenticated(): boolean {
        return true;
    }
}
