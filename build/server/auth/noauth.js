#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var promise_mod = require('es6-promise');
var Promise = promise_mod.Promise;
var NoAuth = (function () {
    function NoAuth() {
    }
    /**
     * Is the user authenticated?
     */
    NoAuth.prototype.authenticated = function (request) {
        return Promise.resolve(true);
    };
    return NoAuth;
})();
exports.NoAuth = NoAuth;
