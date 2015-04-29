// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
/// <reference path="typings/nodegetopt.d.ts" />
import http = require("http");
import api_host = require("./api_host");
import api = require("./api");
import config = require("./config");

// Load configurables.
import mongo = require("./mongo");

// Add configurables.
var port = config.parser.register('port', 'Port to listen on', 'p', 8989);
var version = config.parser.register('version', 'Show version', 'v');
config.parser.register('help', 'Display this help', 'h');

// Print version and exit if requested
version.then(version => {
    if (version) {
        console.log("0.1.0")
    } else {

        // Launch the server
        port.then(port => {
            http.createServer(api_host.host(new api.API())).listen(port);
            console.log("Server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
        });
    }
});

// Parse config.
config.parser.parse();
