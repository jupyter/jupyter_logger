// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/// <reference path="typings/tsd.d.ts" />
import assert = require('assert');
import chalk = require('chalk');
import promise_mod = require('es6-promise');
import mongodb_mod = require('mongodb');
import config = require("./config");
var Promise = promise_mod.Promise;

var MongoClient = mongodb_mod.MongoClient;

var url = config.parser.register('mongourl=ARG', 'URL of the mongod service.', undefined, 'mongodb://localhost:27017/jupyterlogger');

export class Mongo {
    private _timeout: number = 10; // s
    private _db: Promise<any>;
    private _db_resolve: (...args: any[])=>any;
    private _db_reject: (...args: any[])=>any;
    private _connected: boolean = false;
    private _connection_timer: NodeJS.Timer = null;

    public constructor() {
        this._reset();
    }

    /**
     * Gets an active database connection.
     */
    public get_db(): Promise<any> {
        if (this._connection_timer) clearTimeout(this._connection_timer);
        this._connection_timer = setTimeout(() => { this._disconnect; }, this._timeout*1000);

        if (!this._connected) this._connect();
        return this._db;
    }

    /**
     * Inserts an entry into a datbase collection (by name).
     * @param name - name of the collection
     * @param x - item to insert
     */
    public db_insert(name: string, x: any): Promise<any> {
        return this.get_db().then(db => {
            var collection = db.collection(name);
            return new Promise((resolve, reject) => {           
                collection.insert(x, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }          
                });
            });
        });
    }

    /**
     * Find the entries that match a dictionary of parameters in a collection (by name)
     * @param name - name of the collection
     * @param x - item to find.  The matching alogrithm doesn't require the
     *            item to be described in full.  i.e. if the item you are looking
     *            for is {a: 1, b: 2, c: 3}, it would be okay to specify
     *            {b: 2}, the algorithm would find the value, but also other
     *            values that share b==2.
     */
    public db_find(name: string, x: any): Promise<any[]> {
        return this.get_db().then(db => {
            var collection = db.collection(name);
            return new Promise((resolve, reject) => {           
                collection.find(x).toArray((err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }          
                });
            });
        });
    }

    /** 
     * Connects to the db
     */
    private _connect(): void {
        if (this._connected) return;
        this._connected = true;

        // Use connect method to connect to the Server
        this._print("Connecting to mongod...");
        url.then(url => {
            MongoClient.connect(url, (err, db) => {
                if (err) {
                    this._connected = false;
                    this._db_reject(err);
                } else {
                    this._print("Connected to mongod");
                    this._db_resolve(db);
                }
            });
        });
    }

    /**
     * Disconnects from the db
     */
    private _disconnect(): void {
        if (this._connected) {
            this._print("Disconnecting from mongod...");
            this._db.then(db => {
                this._print("Disconneced from mongod");
                db.close();
                this._reset();
            });
        }
    }

    /**
     * Resets the connection to the db
     */
    private _reset(): void {
        this._connected = false;
        this._db = new Promise((resolve, reject) => {
            this._db_resolve = resolve;
            this._db_reject = reject;
        });
    }

    /**
     * Print utility
     */
    private _print(...args): void {
        console.log(chalk.blue('mongod'), ...args);
    }
}
