#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/// <reference path="typings/tsd.d.ts" />
/// <reference path="typings/querystring.d.ts" />
var url = require("url");
var path = require("path");
var query_string = require('query-string');
var promise_mod = require('es6-promise');
var Promise = promise_mod.Promise;
exports.parse_url = function (request) {
    return url.parse(request.url);
};
exports.get_params = function (request) {
    return query_string.parse(exports.parse_url(request).search);
};
exports.get_uri = function (request) {
    return url.parse(request.url).pathname;
};
exports.get_filename = function (request) {
    return path.join(process.cwd(), exports.get_uri(request));
};
exports.error_response = function (response, err_code, err_text) {
    response.writeHead(err_code, { "Content-Type": "text/plain" });
    response.write(err_text);
    response.end();
};
exports.success_response = function (response, content, mime_type) {
    if (mime_type === void 0) { mime_type = "text/plain"; }
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.writeHead(200, { "Content-Type": mime_type });
    response.write(content);
    response.end();
};
exports.get_payload = function (request) {
    return new Promise(function (resolve, reject) {
        var data = '';
        request.addListener('data', function (chunk) { return data += chunk; });
        request.addListener('error', function (error) { return reject(error); });
        request.addListener('end', function (chunk) {
            if (chunk)
                data += chunk;
            resolve(data);
        });
    });
};
