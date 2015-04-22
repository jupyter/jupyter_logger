// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
/// <reference path="typings/nodegetopt.d.ts" />
import http = require("http");
import getopt = require('node-getopt');
import api_host = require("./api_host");
import api = require("./api");

// Parse the commandline
var opt: any = getopt.create([
  ['p' , 'port'                , 'Port to listen on'],
  ['' ,  'mongo_port'          , 'Mongod port to connect to'],
  ['' ,  'mongo_address'       , 'Mongod address to connect to'],
  ['h' , 'help'                , 'Display this help'],
  ['v' , 'version'             , 'Show version']
]).bindHelp().parseSystem();

// Print version and exit if requested
if (opt.version) {
    console.log("0.1.0")
} else {

    // Launch the server, default to port 8989
    var port = opt.port || 8989;
    http.createServer(api_host.host(new api.API(opt.mongo_address, opt.mongo_port))).listen(port);
    console.log("Server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
}
