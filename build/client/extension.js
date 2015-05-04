// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="typings/tsd.d.ts" />
// Lazily loaded via requirejs, see the bottom of this file.
var $;
var configmod;
var utils;
var dialog;
var keyboardmanager_mod;
var actions_mod;
var keyboard;
var keycodes;
var url_base;
var _hashed_objects = 0;
/**
 * Generates a unique hash for an object.
 */
var hash = function (x) {
    if (x.__hash__ === undefined) {
        x.__hash__ = _hashed_objects++;
    }
    return x.__hash__;
};
/**
 * Print utility function.
 */
var log = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    console.log.apply(console, ['Jupyter logger:'].concat(args));
};
/**
 * Creates a guid.
 *
 * Credit is given where credit is deserved,
 * http://stackoverflow.com/a/2117523/2824256
 */
var guid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
/**
 * Gets a selector that represents the element.
 */
var get_selector = function (el) {
    if (el.id) {
        return '#' + el.id;
    }
    else {
        var classes = [];
        if (el.classList) {
            for (var i = 0; i < el.classList.length; i++) {
                classes.push(el.classList[i]);
            }
        }
        var this_selector = ([el.tagName.toLowerCase()].concat(classes)).join('.');
        if (el.parentNode && el.parentNode.tagName !== undefined) {
            return get_selector(el.parentNode) + ' > ' + this_selector;
        }
        else {
            return this_selector;
        }
    }
};
/**
 * AJAX request utility function.
 * @return Promise for the response text.
 */
var ajax = function (url, method, parameters) {
    return new Promise(function (resolve, reject) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(method || 'GET', url, true);
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                if (xmlhttp.status == 200) {
                    resolve(xmlhttp.responseText);
                }
                else {
                    reject({ status: xmlhttp.status, response: xmlhttp.responseText });
                }
            }
        };
        if (method === 'POST' && parameters) {
            xmlhttp.send(JSON.stringify(parameters));
        }
        else {
            xmlhttp.send();
        }
    });
};
/**
 * Represents Jupyter client config.
 */
var JupyterConfig = (function () {
    function JupyterConfig(config_name) {
        // Load the configuration for the logger.
        var base_url = utils.get_body_data('baseUrl');
        this._config = new configmod.ConfigSection(config_name, { base_url: base_url });
        this._config.load();
    }
    /**
     * Gets a value.
     * @param key
     * @param default_value - callback
     * @param persist_default - should the default value be saved.
     * @return promise for the value.
     */
    JupyterConfig.prototype.get = function (key, default_value, persist_default) {
        var _this = this;
        return this._config.loaded.then(function () {
            if (_this._config.data[key] === undefined) {
                return Promise.resolve(default_value()).then(function (value) {
                    if (persist_default) {
                        var update = {};
                        update[key] = value;
                        _this._config.update(update);
                    }
                    return value;
                });
            }
            else {
                return Promise.resolve(_this._config.data[key]);
            }
        });
    };
    /**
     * Sets a value.
     */
    JupyterConfig.prototype.set = function (key, value) {
        var update = {};
        update[key] = value;
        return this._config.update(update);
    };
    return JupyterConfig;
})();
/**
 * Information about the client.
 */
var ClientInfo = (function () {
    function ClientInfo(config) {
        var _this = this;
        this.loaded = Promise.all([
            config.get('id', guid, true).then(function (id) { _this._id = id; }),
            config.get('opt_in', this._prompt_opt_in, true).then(function (opt_in) {
                _this._opt_in = opt_in;
                // Add a recording dot.
                if (opt_in) {
                    $('<div/>')
                        .css({
                        background: '#F00',
                        width: 10,
                        height: 10,
                        position: 'fixed',
                        right: 10,
                        top: 10,
                        'border-radius': 5,
                        'z-index': 9999,
                        opacity: 0.3,
                        border: '1px solid black'
                    })
                        .attr('title', 'Anonymous usage data is being collected.')
                        .appendTo($('body'));
                }
            }),
        ]).then(function () {
            if (_this._opt_in) {
                return config.get('sex', _this._prompt_sex, true).then(function (sex) { _this._sex = sex; });
            }
            else {
                _this._sex = null;
                return;
            }
        }).then(function () {
            return {
                id: _this._id,
                opt_in: _this._opt_in,
                sex: _this._sex
            };
        });
    }
    Object.defineProperty(ClientInfo.prototype, "id", {
        /**
         * Client's unique id.
         */
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClientInfo.prototype, "sex", {
        /*
         * Client's sex.
         * @return 'm' or 'f'
         */
        get: function () {
            return this._sex;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClientInfo.prototype, "opt_in", {
        /**
         * Does the client want to participate.
         */
        get: function () {
            return this._opt_in;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Synchronized time.
     */
    ClientInfo.prototype.now = function () {
        // TODO: Synchronize the client clock with a central time server.
        return Date.now();
    };
    /**
     * Ask if the user wants to participate.
     */
    ClientInfo.prototype._prompt_opt_in = function () {
        return ajax(url_base + '/auth', 'GET').then(function (value) {
            if (value === 'yes') {
                return new Promise(function (resolve, reject) {
                    require(['base/js/dialog'], function (dlg) {
                        dlg.modal({
                            body: 'May Project Jupyter collect anonymous Jupyter Notebook usage information?',
                            title: 'Jupyter Notebook user study',
                            buttons: {
                                Yes: { click: function () { resolve(true); }, class: 'btn-primary' },
                                No: { click: function () { resolve(false); } }
                            }
                        });
                    });
                });
            }
            else {
                return false;
            }
        });
    };
    /**
     * Ask the user if they are a male or female.
     */
    ClientInfo.prototype._prompt_sex = function () {
        // No-op for now.
        return Promise.resolve('');
    };
    return ClientInfo;
})();
/**
 * Abstract representation of a backend.
 */
var BackendBase = (function () {
    function BackendBase(client_info) {
        this._client_info = client_info;
    }
    BackendBase.prototype.push = function (entry) {
        var _this = this;
        return this._client_info.loaded.then(function () {
            entry.timestamp = _this._client_info.now();
            entry.client_id = _this._client_info.id;
            return {
                entry_type: entry.constructor.name,
                entry: entry.to_dictionary()
            };
        });
    };
    return BackendBase;
})();
/**
 * Restful MongoDB backend.
 */
var MongoDBBackend = (function (_super) {
    __extends(MongoDBBackend, _super);
    function MongoDBBackend(client_info, url_base) {
        _super.call(this, client_info);
        this._url_base = url_base;
        this._entry_registry = {};
        this.loaded = this._submit_client_info();
    }
    MongoDBBackend.prototype.push = function (entry) {
        var _this = this;
        return Promise.resolve().then(function () {
            if (_this._entry_registry[hash(entry)] !== undefined) {
                return;
            }
            else {
                return _this._register_entry(entry);
            }
        }).then(function () {
            return _super.prototype.push.call(_this, entry);
        }).then(function (compiled) {
            return ajax(_this._make_url('entry'), 'POST', compiled);
        });
    };
    MongoDBBackend.prototype._register_entry = function (entry) {
        this._entry_registry[hash(entry)] = true;
        return ajax(this._make_url('register'), 'POST', {
            entry_type: entry.constructor.name,
            columns: entry.columns
        });
    };
    MongoDBBackend.prototype._submit_client_info = function () {
        var _this = this;
        return this._client_info.loaded.then(function (info) {
            return ajax(_this._make_url('client'), 'POST', info);
        });
    };
    MongoDBBackend.prototype._make_url = function (command) {
        return this._url_base + '/' + command;
    };
    return MongoDBBackend;
})(BackendBase);
/**
 * Represents a basic database entry.
 */
var Entry = (function () {
    function Entry(options) {
        var _this = this;
        var columns = this.columns;
        columns.forEach(function (column) {
            if (options[column] !== undefined) {
                _this[column] = options[column];
            }
        });
    }
    Object.defineProperty(Entry.prototype, "columns", {
        get: function () {
            return this._get_columns();
        },
        enumerable: true,
        configurable: true
    });
    Entry.prototype._get_columns = function () {
        return ['client_id'];
    };
    Entry.prototype.validate = function () {
        var _this = this;
        this.columns.forEach(function (column) {
            if (_this[column] === undefined) {
                throw Error('Entry attribute "' + column + '" is undefined.');
            }
        });
    };
    Entry.prototype.to_dictionary = function () {
        var _this = this;
        var x = {};
        this.columns.forEach(function (column) {
            x[column] = _this[column];
        });
        return x;
    };
    return Entry;
})();
var ClientEntry = (function (_super) {
    __extends(ClientEntry, _super);
    function ClientEntry() {
        _super.apply(this, arguments);
    }
    ClientEntry.prototype._get_columns = function () {
        return _super.prototype._get_columns.call(this).concat(['sex']);
    };
    return ClientEntry;
})(Entry);
var EventEntry = (function (_super) {
    __extends(EventEntry, _super);
    function EventEntry() {
        _super.apply(this, arguments);
    }
    EventEntry.prototype._get_columns = function () {
        return _super.prototype._get_columns.call(this).concat(['event_name', 'timestamp', 'browser', 'app', 'app_metadata']);
    };
    return EventEntry;
})(Entry);
var AppEventEntry = (function (_super) {
    __extends(AppEventEntry, _super);
    function AppEventEntry() {
        _super.apply(this, arguments);
    }
    AppEventEntry.prototype._get_columns = function () {
        return _super.prototype._get_columns.call(this).concat(['triggered_by', 'metadata']);
    };
    return AppEventEntry;
})(EventEntry);
var KBEventEntry = (function (_super) {
    __extends(KBEventEntry, _super);
    function KBEventEntry() {
        _super.apply(this, arguments);
    }
    KBEventEntry.prototype._get_columns = function () {
        return _super.prototype._get_columns.call(this).concat(['event_id', 'actionable', 'element_selector',
            'alt_key', 'shift_key', 'meta_key', 'ctrl_key', 'key']);
    };
    return KBEventEntry;
})(EventEntry);
var MouseEventEntry = (function (_super) {
    __extends(MouseEventEntry, _super);
    function MouseEventEntry() {
        _super.apply(this, arguments);
    }
    MouseEventEntry.prototype._get_columns = function () {
        return _super.prototype._get_columns.call(this).concat(['event_id', 'element_selector',
            'button', 'client_x', 'client_y', 'screen_x', 'screen_y', 'alt_key',
            'shift_key', 'meta_key', 'ctrl_key']);
    };
    return MouseEventEntry;
})(EventEntry);
/**
 * Class used to monitor a Jupyter app.
 */
var Monitor = (function () {
    function Monitor(backend, app_name) {
        var _this = this;
        this._backend = backend;
        this._app_name = app_name;
        this.loaded = backend.loaded.then(function () {
            return Promise.resolve(_this.register_events());
        });
    }
    Monitor.prototype.register_events = function () {
        this._register_mouse_events();
        this._register_keyboard_events();
        this._register_page_events();
    };
    Monitor.prototype.metadata = function () {
        var proto = window.location.href.split('://')[0];
        var address = window.location.href.split('://')[1];
        var command = address.split('?')[0].replace(/[a-zA-Z\-_0-9]+/g, 'X');
        var query = address.split('?')[1];
        return { url: proto + '://' + command + '?' + query };
    };
    Monitor.prototype.push = function (entry_class, options) {
        var all_options = {
            app: this._app_name,
            app_metadata: this.metadata(),
            browser: window.clientInformation.userAgent,
        };
        Object.keys(options).forEach(function (x) { return all_options[x] = options[x]; });
        var entry = new entry_class(all_options);
        return this._backend.push(entry).then(function () { return entry; });
    };
    Object.defineProperty(Monitor.prototype, "_interesting_keys", {
        get: function () {
            return ['ctrl-c', 'ctrl-v', 'ctrl-x', 'ctrl-z', 'ctrl-y', 'ctrl-s',
                'ctrl-d', 'ctrl-f', 'ctrl-shift-f', 'ctrl-y', 'ctrl-g',
                'meta-c', 'meta-v', 'meta-x', 'meta-z', 'meta-y', 'meta-s',
                'meta-d', 'meta-f', 'meta-shift-f', 'meta-y', 'meta-g'];
        },
        enumerable: true,
        configurable: true
    });
    Monitor.prototype._register_page_events = function () {
        var _this = this;
        $(window)
            .focus(function () {
            _this.push(EventEntry, {
                event_name: 'focus',
                triggered_by: 0,
            });
        })
            .blur(function () {
            _this.push(EventEntry, {
                event_name: 'blur',
                triggered_by: 0,
            });
        });
    };
    Monitor.prototype._register_mouse_events = function () {
        var _this = this;
        $('body').click(function (e) { return _this.push(MouseEventEntry, _this._mouse_event('click', e)); });
        $('body').dblclick(function (e) { return _this.push(MouseEventEntry, _this._mouse_event('dblclick', e)); });
        // $('body').on('mouseover', e => this.push(MouseEventEntry, this._mouse_event('mouseover', e)));
        // $('body').on('mouseout', e => this.push(MouseEventEntry, this._mouse_event('mouseout', e)));
        // $('body').on('mousedown', e => this.push(MouseEventEntry, this._mouse_event('mousedown', e)));
        // $('body').on('mouseup', e => this.push(MouseEventEntry, this._mouse_event('mouseup', e)));
    };
    Monitor.prototype._register_keyboard_events = function () {
        var _this = this;
        $('body').keydown(function (e) {
            var key = keyboard.event_to_shortcut(e);
            if (_this._interesting_keys.indexOf(key) !== -1) {
                _this.push(KBEventEntry, _this._keyboard_event('keydown', e));
            }
        });
    };
    Monitor.prototype._keyboard_event = function (name, e, actionable) {
        e.logged_id = guid();
        return {
            event_name: name,
            actionable: actionable || false,
            key: keyboard.event_to_shortcut(e),
            event_id: e.logged_id || -1,
            alt_key: e.altKey || false,
            shift_key: e.shiftKey || false,
            meta_key: e.metaKey || false,
            ctrl_key: e.ctrlKey || false
        };
    };
    Monitor.prototype._mouse_event = function (name, e) {
        e.logged_id = guid();
        return {
            event_name: name,
            event_id: e.logged_id || -1,
            element_selector: get_selector(e.target),
            button: e.button || 0,
            screen_x: e.screenX || 0,
            screen_y: e.screenY || 0,
            client_x: e.clientX || 0,
            client_y: e.clientY || 0,
            alt_key: e.altKey || false,
            shift_key: e.shiftKey || false,
            meta_key: e.metaKey || false,
            ctrl_key: e.ctrlKey || false,
        };
    };
    return Monitor;
})();
/**
 * Class used to monitor the notebook app.
 */
var NotebookMonitor = (function (_super) {
    __extends(NotebookMonitor, _super);
    function NotebookMonitor(backend) {
        _super.call(this, backend, 'notebook');
    }
    NotebookMonitor.prototype.metadata = function () {
        var num_cells = IPython.notebook.get_ncells();
        var cells = [];
        for (var i = 0; i < num_cells; i++) {
            var cell = IPython.notebook.get_cell(i);
            var type = cell.cell_type;
            var text = cell.get_text();
            var lines = text.split('\n');
            cells.push([type, lines]);
        }
        var metadata = _super.prototype.metadata.call(this);
        metadata['cells'] = cells;
        var site = $('#site')[0];
        metadata['scroll_height'] = site.scrollHeight;
        metadata['scroll_top'] = site.scrollTop;
        metadata['mode'] = IPython.notebook.mode;
        metadata['active_cell'] = IPython.notebook.get_selected_index();
        return metadata;
    };
    NotebookMonitor.prototype.register_events = function () {
        var _this = this;
        this._register_mouse_events();
        this._register_page_events();
        // Log keyboard events.
        var original_keydown = IPython.keyboard_manager.handle_keydown;
        var that = this;
        keyboardmanager_mod.KeyboardManager.prototype.handle_keydown = function (e) {
            if (e.which === keycodes.esc) {
                e.preventDefault();
            }
            if (!this.enabled) {
                if (e.which === keycodes.esc) {
                    this.notebook.command_mode();
                    return false;
                }
                return true;
            }
            var handled = false;
            if (this.mode === 'edit') {
                handled = this.edit_shortcuts.handles(e);
            }
            else if (this.mode === 'command') {
                handled = this.command_shortcuts.handles(e);
            }
            if (handled) {
                that.push(KBEventEntry, that._keyboard_event('keydown', e, true));
                return original_keydown.call(IPython.keyboard_manager, e);
            }
            else {
                var key = keyboard.event_to_shortcut(e);
                if (that._interesting_keys.indexOf(key) !== -1) {
                    that.push(KBEventEntry, that._keyboard_event('keydown', e, false));
                }
            }
            return true;
        };
        // Log actions.
        var hooked = IPython.keyboard_manager.actions.call;
        actions_mod.init.prototype.call = function (name, e, env) {
            hooked.call(IPython.keyboard_manager.actions, name, e, env);
            _this.push(AppEventEntry, {
                event_name: 'action',
                triggered_by: e.logged_id || 0,
                metadata: { action_name: name },
            });
        };
    };
    return NotebookMonitor;
})(Monitor);
/**
 * Class used to monitor the tree (dashboard) app.
 */
var TreeMonitor = (function (_super) {
    __extends(TreeMonitor, _super);
    function TreeMonitor(backend) {
        _super.call(this, backend, 'tree');
    }
    TreeMonitor.prototype.register_events = function () {
        var _this = this;
        _super.prototype.register_events.call(this);
        $("a[href=#running]").on('shown.bs.tab', function (e) {
            _this.push(AppEventEntry, {
                event_name: 'running_tab',
                triggered_by: e.logged_id || -1,
                metadata: {},
            });
        });
        $("a[href=#notebooks]").on('shown.bs.tab', function (e) {
            _this.push(AppEventEntry, {
                event_name: 'files_tab',
                triggered_by: e.logged_id || -1,
                metadata: {},
            });
        });
        $("a[href=#clusters]").on('shown.bs.tab', function (e) {
            _this.push(AppEventEntry, {
                event_name: 'clusters_tab',
                triggered_by: e.logged_id || -1,
                metadata: {},
            });
        });
    };
    return TreeMonitor;
})(Monitor);
/**
 * Class used to monitor the text editor app.
 */
var EditMonitor = (function (_super) {
    __extends(EditMonitor, _super);
    function EditMonitor(backend) {
        _super.call(this, backend, 'edit');
    }
    return EditMonitor;
})(Monitor);
/**
 * Class used to monitor the terminal app.
 */
var TerminalMonitor = (function (_super) {
    __extends(TerminalMonitor, _super);
    function TerminalMonitor(backend) {
        _super.call(this, backend, 'terminal');
    }
    return TerminalMonitor;
})(Monitor);
// Use require.js to asynchronously load the extension.
define([
    'jquery',
    'services/config',
    'base/js/utils',
    'base/js/dialog',
    'notebook/js/keyboardmanager',
    'notebook/js/actions',
    'base/js/keyboard',
    'nbextensions/logger/config'], function (loaded_jquery, loaded_configmod, loaded_utils, loaded_dialog, loaded_keyboardmanager_mod, loaded_actions_mod, loaded_keyboard, loaded_config) {
    $: loaded_jquery;
    configmod = loaded_configmod;
    utils = loaded_utils;
    dialog = loaded_dialog;
    keyboardmanager_mod = loaded_keyboardmanager_mod;
    actions_mod = loaded_actions_mod;
    keyboard = loaded_keyboard;
    keycodes = keyboard.keycodes;
    url_base = loaded_config.url;
    var monitor_class;
    if (document.getElementById("notebook")) {
        monitor_class = NotebookMonitor;
    }
    else if (document.getElementById("running")) {
        monitor_class = TreeMonitor;
    }
    else if (document.getElementById("terminado-container")) {
        monitor_class = TerminalMonitor;
    }
    else if (document.getElementById("texteditor-container")) {
        monitor_class = EditMonitor;
    }
    else {
        return; // Don't log unknown app.
    }
    log('Logger loaded. Connecting...');
    var config = new JupyterConfig('monitor');
    var client_info = new ClientInfo(config);
    var backend = new MongoDBBackend(client_info, url_base);
    log('Creating logger: ', monitor_class.name);
    var monitor = new monitor_class(backend);
    monitor.loaded.then(function () {
        log('Connected!');
        monitor.push(EventEntry, {
            event_name: 'loaded',
            triggered_by: 0,
        });
    }).catch(function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        log.apply(void 0, ['Error connecting...'].concat(args));
    });
});
