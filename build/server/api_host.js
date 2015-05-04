#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/// <reference path="typings/tsd.d.ts" />
var promise_mod = require('es6-promise');
var requests = require("./requests");
var Promise = promise_mod.Promise;
/**
 * Hosts an API.
 * Each method of the API will be exposed as a RESTful URL.
 * @param api - object with named methods
 * @param unhandled - handles when a RESTful URL is requested that doesn't map
 *                    to a function in the API.
 */
exports.host = function (api, unhandled) {
    return function (request, response) {
        // If a method is defined in the API, call it.
        // Only look at the last segment of the URL.
        var path = requests.get_uri(request).substring(1).split('/');
        var method = path[path.length - 1];
        if (api[method] !== undefined) {
            // Resolve the return of the method.  This allows API methods to
            // return promises which will be handled appropriately.
            Promise.resolve(api[method](request, response)).then(function (results) {
                if (typeof results === 'function') {
                    results(request, response);
                }
                else if (results.mime !== undefined) {
                    requests.success_response(response, results.value, results.mime);
                }
                else {
                    requests.success_response(response, results, undefined);
                }
            });
        }
        else if (unhandled !== undefined) {
            return unhandled(request, response);
        }
        else {
            console.log(method);
            requests.error_response(response, 501, "Not Implemented\n");
        }
    };
};
