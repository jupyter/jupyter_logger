#!/usr/bin/env node
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var chalk = require('chalk');
var promise_mod = require('es6-promise');
var mongodb_mod = require('mongodb');
var config = require("./config");
var Promise = promise_mod.Promise;
var MongoClient = mongodb_mod.MongoClient;
var url = config.parser.register('mongourl=ARG', 'URL of the mongod service.', undefined, 'mongodb://localhost:27017/jupyterlogger');
var Mongo = (function () {
    function Mongo() {
        this._timeout = 10; // s
        this._connected = false;
        this._connection_timer = null;
        this._reset();
    }
    /**
     * Gets an active database connection.
     */
    Mongo.prototype.get_db = function () {
        var _this = this;
        if (this._connection_timer)
            clearTimeout(this._connection_timer);
        this._connection_timer = setTimeout(function () { _this._disconnect; }, this._timeout * 1000);
        if (!this._connected)
            this._connect();
        return this._db;
    };
    /**
     * Inserts an entry into a datbase collection (by name).
     * @param name - name of the collection
     * @param x - item to insert
     */
    Mongo.prototype.db_insert = function (name, x) {
        return this.get_db().then(function (db) {
            var collection = db.collection(name);
            return new Promise(function (resolve, reject) {
                collection.insert(x, function (err, res) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res);
                    }
                });
            });
        });
    };
    /**
     * Find the entries that match a dictionary of parameters in a collection (by name)
     * @param name - name of the collection
     * @param x - item to find.  The matching alogrithm doesn't require the
     *            item to be described in full.  i.e. if the item you are looking
     *            for is {a: 1, b: 2, c: 3}, it would be okay to specify
     *            {b: 2}, the algorithm would find the value, but also other
     *            values that share b==2.
     */
    Mongo.prototype.db_find = function (name, x) {
        return this.get_db().then(function (db) {
            var collection = db.collection(name);
            return new Promise(function (resolve, reject) {
                collection.find(x).toArray(function (err, res) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res);
                    }
                });
            });
        });
    };
    /**
     * Connects to the db
     */
    Mongo.prototype._connect = function () {
        if (this._connected)
            return;
        this._connected = true;
        // Use connect method to connect to the Server
        this._print("Connecting to mongod...");
        url.then(function (url) {
            MongoClient.connect(url, function (err, db) {
                if (err) {
                    this._connected = false;
                    this._db_reject(err);
                }
                else {
                    this._print("Connected to mongod");
                    this._db_resolve(db);
                }
            });
        });
    };
    /**
     * Disconnects from the db
     */
    Mongo.prototype._disconnect = function () {
        var _this = this;
        if (this._connected) {
            this._print("Disconnecting from mongod...");
            this._db.then(function (db) {
                _this._print("Disconneced from mongod");
                db.close();
                _this._reset();
            });
        }
    };
    /**
     * Resets the connection to the db
     */
    Mongo.prototype._reset = function () {
        var _this = this;
        this._connected = false;
        this._db = new Promise(function (resolve, reject) {
            _this._db_resolve = resolve;
            _this._db_reject = reject;
        });
    };
    /**
     * Print utility
     */
    Mongo.prototype._print = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log.apply(console, [chalk.blue('mongod')].concat(args));
    };
    return Mongo;
})();
exports.Mongo = Mongo;
