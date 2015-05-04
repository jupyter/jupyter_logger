#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var noauth = require('./noauth');
var hubauth = require('./hubauth');
var to_export = {
    NoAuth: noauth.NoAuth,
    HubAuth: hubauth.HubAuth
};
to_export.load = function (name, port) {
    // If the auth isn't intrinsic, dynamically load it.
    if (to_export[name] === undefined) {
        return (new (require(name))(port));
    }
    else {
        return (new to_export[name](port));
    }
};
module.exports = to_export;
