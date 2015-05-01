// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
/// <reference path="typings/nodegetopt.d.ts" />
import http = require("http");
import api_host = require("./api_host");
import api = require("./api");
import config = require("./config");
import install = require("./install");
import auth_mod = require("./auth/init");
import promise_mod = require('es6-promise');
var Promise = promise_mod.Promise;

// Load configurables.
import mongo = require("./mongo");

// Add configurables.
var install_flag = config.parser.register('install', 'Installs the client', 'i');
var port = config.parser.register('port=ARG', 'Port to listen on', 'p', 8989);
var version = config.parser.register('version', 'Show version', 'v');
var auth = config.parser.register('auth=ARG', `Authentification class.  If you 
    specifiy a value other than a builtin value, the class is dynamically
    loaded using require.`, 'a', 'NoAuth');

config.parser.register('help', 'Display this help', 'h');

// Print version and exit if requested
Promise.all([version, port, auth, install_flag]).then((values: any[]) => {
    [version, port, auth, install_flag] = values;
    if (version) {
        console.log("0.1.0");
    } else if (install_flag) {
        install.install();
    } else {

        // Launch the server
        var auth_instance = auth_mod.load(auth, port);        
        http.createServer(api_host.host(new api.API(auth_instance))).listen(port);
        console.log("Server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
    }
});

// Parse config.
config.parser.parse();
