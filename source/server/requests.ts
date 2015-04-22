// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
/// <reference path="typings/querystring.d.ts" />
import url = require("url");
import path = require("path");
import query_string = require('query-string');
import promise_mode = require('es6-promise');
import http = require("http"); // Types only

export var parse_url = function(request: http.IncomingMessage): url.Url {
    return url.parse(request.url);
};

export var get_params = function(request: http.IncomingMessage): any {
    return query_string.parse(parse_url(request).search);
};

export var get_uri = function(request: http.IncomingMessage): string {
    return url.parse(request.url).pathname;
};

export var get_filename = function(request: http.IncomingMessage): string {
    return path.join(process.cwd(), get_uri(request));
};

export var error_response = function(response: http.ServerResponse, err_code: number, err_text: string): void {
    response.writeHead(err_code, {"Content-Type": "text/plain"});
    response.write(err_text);
    response.end();
};

export var success_response = function(response: http.ServerResponse, content: any, mime_type: string="text/plain"): void {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.writeHead(200, {"Content-Type": mime_type});
    response.write(content);
    response.end();
};

export var get_payload = function(request: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        var data = '';
        request.addListener('data', chunk => data += chunk);
        request.addListener('error', error => reject(error));
        request.addListener('end', function(chunk){
            if (chunk) data += chunk;
            resolve(data);
        });
    });
};
