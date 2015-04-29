// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="../typings/tsd.d.ts" />
import i_auth = require('./i_auth');
import noauth = require('./noauth');
import hubauth = require('./hubauth');

var to_export: any = {
    NoAuth: noauth.NoAuth,
    HubAuth: hubauth.HubAuth
};
to_export.load = function(name: string): i_auth.IAuth {
    // If the auth isn't intrinsic, dynamically load it.
    if (to_export[name]===undefined) {
        return <i_auth.IAuth><any>(new (<any>require(name))());
    } else {
        return <i_auth.IAuth><any>(new to_export[name]());
    }
};

export = to_export;
