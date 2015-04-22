// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
import assert = require('assert');
import chalk = require('chalk');
import promise_mod = require('es6-promise');
import mongodb_mod = require('mongodb');

var MongoClient = mongodb_mod.MongoClient;

export class Mongo {
    private _url: string = 'mongodb://localhost:27017/jupyterlogger';
    private _timeout: number = 10; // s
    private _db: Promise<any>;
    private _db_resolve;
    private _db_reject;
    private _connected: boolean = false;
    private _connection_timer: NodeJS.Timer = null;

    public constructor(address: string='localhost', port: number=27017) {
        // Connection URL
        this._url = 'mongodb://' + address + ':' + String(port) + '/jupyterlogger';
        this._reset();
    }

    public get_db() {
        if (this._connection_timer) clearTimeout(this._connection_timer);
        this._connection_timer = setTimeout(() => { this._disconnect; }, this._timeout*1000);

        if (!this._connected) this._connect();
        return this._db;
    }

    public db_insert(name, x) {
        return this.get_db().then(db => {
            var collection = db.collection(name);
            return new Promise((resolve, reject) => {           
                collection.insert(x, function(err, res) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }          
                });
            });
        });
    }

    public db_find(name, x): Promise<any[]> {
        return this.get_db().then(db => {
            var collection = db.collection(name);
            return new Promise((resolve, reject) => {           
                collection.find(x).toArray(function(err, res) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }          
                });
            });
        });
    }

    private _connect() {
        if (this._connected) return;
        this._connected = true;

        // Use connect method to connect to the Server
        this._print("Connecting to mongod...");
        MongoClient.connect(this._url, function(err, db) {
            if (err) {
                this._connected = false;
                this._db_reject(err);
            } else {
                this._print("Connected to mongod");
                this._db_resolve(db);
            }
        });
    }

    private _disconnect() {
        if (this._connected) {
            this._print("Disconnecting from mongod...");
            this._db.then(db => {
                this._print("Disconneced from mongod");
                db.close();
                this._reset();
            });
        }
    }

    private _reset(): void {
        this._connected = false;
        this._db = new Promise((resolve, reject) => {
            this._db_resolve = resolve;
            this._db_reject = reject;
        });
    }

    private _print(...args): void {
        console.log(chalk.blue('mongod'), ...args);
    }
}
