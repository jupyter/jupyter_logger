#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/// <reference path="typings/tsd.d.ts" />
/// <reference path="typings/nodegetopt.d.ts" />
var http = require("http");
var api_host = require("./api_host");
var api = require("./api");
var config = require("./config");
var install = require("./install");
var auth_mod = require("./auth/init");
var promise_mod = require('es6-promise');
var Promise = promise_mod.Promise;
// Add configurables.
var install_flag = config.parser.register('install', 'Installs the client', 'i');
var port = config.parser.register('port=ARG', 'Port to listen on', 'p', 8989);
var version = config.parser.register('version', 'Show version', 'v');
var auth = config.parser.register('auth=ARG', "Authentification class.  If you \n    specifiy a value other than a builtin value, the class is dynamically\n    loaded using require.", 'a', 'NoAuth');
config.parser.register('help', 'Display this help', 'h');
// Print version and exit if requested
Promise.all([version, port, auth, install_flag]).then(function (values) {
    version = values[0], port = values[1], auth = values[2], install_flag = values[3];
    if (version) {
        console.log("0.1.2");
    }
    else if (install_flag) {
        install.install();
    }
    else {
        // Launch the server
        var auth_instance = auth_mod.load(auth, port);
        http.createServer(api_host.host(new api.API(auth_instance))).listen(port);
        console.log("Server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
    }
});
// Parse config.
config.parser.parse();
