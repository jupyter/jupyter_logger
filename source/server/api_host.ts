// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
import promise_mod = require('es6-promise');
import requests = require("./requests");
import http = require("http"); // Types only
var Promise = promise_mod.Promise;

interface IRequestListener {
    (
        request: http.IncomingMessage,
        response: http.ServerResponse
    ): any;
}

/**
 * Hosts an API.
 * Each method of the API will be exposed as a RESTful URL.
 * @param api - object with named methods
 * @param unhandled - handles when a RESTful URL is requested that doesn't map
 *                    to a function in the API.
 */
export var host = function(api: any, unhandled?: IRequestListener): IRequestListener {
    return (request: http.IncomingMessage, response: http.ServerResponse): any => {
        
        // If a method is defined in the API, call it.
        var method = requests.get_uri(request).substring(1);
        if (api[method] !== undefined)  {

            // Resolve the return of the method.  This allows API methods to
            // return promises which will be handled appropriately.
            Promise.resolve(api[method](request, response)).then(results => {
                if (typeof results === 'function') {
                    results(request, response);
                } else if (results.mime!==undefined){
                    requests.success_response(response, results.value, results.mime);
                } else {
                    requests.success_response(response, results, undefined);
                }
            });

        // Fallback to the "unhandled" handler.
        } else if (unhandled !== undefined) {
            return unhandled(request, response);
        
        // If no "unhandled" handler was specified, throw an error.
        } else {
            requests.error_response(response, 501, "Not Implemented\n");
        }
    };
};
