// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
import config = require('./config');
import chalk = require('chalk');
import child_process = require('child_process');
import path = require('path');
import fs = require('fs');

var install_user = config.parser.register('install_user', 'Install for the current user');
var install_overwrite = config.parser.register('install_overwrite', 'Overwrite existing install');
var install_symlink = config.parser.register('install_symlink', 'Symlink the extension');
var install_url = config.parser.register('install_url=ARG', 'URL for the extension to reference', undefined, 'http://127.0.0.1:8989');

export var install = function() {
    Promise.all([install_user, install_overwrite, install_symlink, install_url]).then(values => {
        [install_user, install_overwrite, install_symlink, install_url] = values;
        console.log(chalk.green.bold('   Installing client extension...'));
        
        var extension_path: string = path.join(__dirname, '..', 'client');
        console.log(chalk.white('   client path: ' + extension_path));

        console.log(chalk.white('   writing config...'));
        fs.writeFileSync(path.join(extension_path, 'config.js'), 
            'define([], function() { return \'' + JSON.stringify({url: <any>install_url}) + '\'; });'
        );

        var args: string[] = [];
        if (install_symlink) args.push('--symlink');
        if (install_user) args.push('--user');
        if (install_overwrite) args.push('--overwrite');
        args.push('--destination=logger');
        args.push('"' + extension_path + '"');

        var command: string = 'ipython install-nbextension ' + args.join(' ');
        console.log(chalk.white('   running install-nbextension'));
        child_process.execSync(command);
        
        console.log(chalk.green.bold('   Done'));

    }).catch(e => {
        console.log(chalk.bgRed.bold('Error'));
        console.error(e);
    });
};
