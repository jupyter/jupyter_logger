// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// This file must be installed as an nbextension.
/// <reference path="typings/tsd.d.ts" />

// Define global IPython variable.
declare var IPython: any;

// Lazily loaded via requirejs, see the bottom of this file.
var $: any;
var configmod: any;
var utils: any;
var dialog: any;
var keyboardmanager_mod: any;
var actions_mod: any;
var keyboard: any;
var keycodes: any;
var url_base: string = 'http://127.0.0.1:8989';

var _hashed_objects: number = 0;

/**
 * Generates a unique hash for an object.
 */
var hash = function(x: any): string {
    if (x.__hash__ === undefined) {
        x.__hash__ = _hashed_objects++;
    }
    return x.__hash__;
};

/**
 * Print utility function.
 */
var log = function(...args: any[]): void {
    console.log('Jupyter logger:', ...args);
};

/**
 * Creates a guid.
 *
 * Credit is given where credit is deserved, 
 * http://stackoverflow.com/a/2117523/2824256
 */
var guid = function(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r: number = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};

/**
 * Gets a selector that represents the element.
 */
var get_selector = function(el: HTMLElement): string { 
    if (el.id) {
        return '#' + el.id;
    } else {
        var classes: string[] = [];
        if (el.classList) {
            for (var i:number=0; i<el.classList.length; i++) {
                classes.push(el.classList[i]);
            }
        }
        var this_selector: string = ([el.tagName.toLowerCase()].concat(classes)).join('.');
        if (el.parentNode && (<HTMLElement>el.parentNode).tagName !== undefined) {
            return get_selector(<HTMLElement>el.parentNode) + ' > ' + this_selector;
        } else {
            return this_selector;
        }
    }
};

/**
 * AJAX request utility function.
 * @return Promise for the response text.
 */
var ajax = function(url: string, method: string, parameters?: any): Promise<string> {
    return new Promise((resolve, reject) => {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(method || 'GET', url, true);


        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == XMLHttpRequest.DONE) {
               if (xmlhttp.status == 200) {
                   resolve(xmlhttp.responseText);
               } else {
                   reject({status: xmlhttp.status, response: xmlhttp.responseText});
               }
            }
        };
        if (method === 'POST' && parameters) {
            xmlhttp.send(JSON.stringify(parameters));
        }
    });
};

/**
 * Represents Jupyter client config.
 */
class JupyterConfig {
    private _config: any;

    public constructor(config_name: string) {

        // Load the configuration for the logger.
        var base_url: string = utils.get_body_data('baseUrl');
        this._config = new configmod.ConfigSection(config_name, {base_url: base_url});
        this._config.load();
    }

    /**
     * Gets a value.
     * @param key
     * @param default_value - callback
     * @param persist_default - should the default value be saved.
     * @return promise for the value.
     */
    public get(key: string, default_value: () => any, persist_default: boolean): Promise<any> {
        return this._config.loaded.then(() => {
            if (this._config.data[key] === undefined) {
                return Promise.resolve(default_value()).then(value => {
                    if (persist_default) {
                        var update = {};
                        update[key] = value;
                        this._config.update(update);    
                    }
                    return value;
                });
            } else {
                return Promise.resolve(this._config.data[key]);
            }
        });
    }

    /**
     * Sets a value.
     */
    public set(key: string, value: any): void {
        var update = {};
        update[key] = value;
        return this._config.update(update);
    }
}

/**
 * Information about the client.
 */
class ClientInfo {
    public loaded: Promise<{ 
            id: string;
            opt_in: boolean;
            sex: string;
    }>;

    private _id: string;
    private _opt_in: boolean;
    private _sex: string;

    public constructor(config: JupyterConfig) {
        this.loaded = Promise.all([
            config.get('id', guid, true).then(id => { this._id = id; }),
            config.get('opt_in', this._prompt_opt_in, true).then(opt_in => { this._opt_in = opt_in; }),
        ]).then(() => {
            if (this._opt_in) {
                return config.get('sex', this._prompt_sex, true).then(sex => { this._sex = sex; });
            } else {
                this._sex = null;
                return;
            }
        }).then(() => { return { 
            id: this._id, 
            opt_in: this._opt_in, 
            sex: this._sex 
        }; });
    }

    /**
     * Client's unique id.
     */
    public get id(): string {
        return this._id;
    }

    /*
     * Client's sex.
     * @return 'm' or 'f'
     */
    public get sex(): string {
        return this._sex;
    }

    /**
     * Does the client want to participate.
     */
    public get opt_in(): boolean {
        return this._opt_in;
    }

    /**
     * Synchronized time.
     */
    public now(): number {
        // TODO: Synchronize the client clock with a central time server.
        return Date.now();
    }

    /**
     * Ask if the user wants to participate.
     */
    private _prompt_opt_in(): Promise<boolean> {
        return ajax(url_base + '/auth', 'GET').then(function(value) {
            if (value==='no') {
                return false;
            } else {
                return new Promise((resolve, reject) => {
                    resolve(window.confirm('Is it okay if project Jupyter collects anonymous usage information?'));
                });
            }
        });
    }

    /**
     * Ask the user if they are a male or female.
     */
    private _prompt_sex(): Promise<string> {
        return new Promise((resolve, reject) => {
            var sex;
            while ((sex = prompt('What is your gender?  (m)ale or (f)emale', 'm')) !== 'm' && sex !== 'f') {}
            resolve(sex);
        });
    }
}

/**
 * Abstract representation of a backend.
 */
class BackendBase {
    public loaded: Promise<any>;

    protected _client_info: ClientInfo;

    public constructor(client_info: ClientInfo) {
        this._client_info = client_info;
    }

    public push(entry: Entry): Promise<any> {
        return this._client_info.loaded.then(() => {
            entry.timestamp = this._client_info.now();
            entry.client_id = this._client_info.id;
            return {
                entry_type: (<any>entry.constructor).name,
                entry: entry.to_dictionary()
            };
        });
    }
}

/**
 * Restful MongoDB backend.
 */
class MongoDBBackend extends BackendBase {
    private _url_base: string;
    private _entry_registry: {[entry_hash: string]: boolean};

    public constructor(client_info: ClientInfo, url_base: string) {
        super(client_info);
        this._url_base = url_base;
        this._entry_registry = {};
        this.loaded = this._submit_client_info();
    }

    public push(entry: Entry): Promise<any> {
        return Promise.resolve().then(() => {
            if (this._entry_registry[hash(entry)] !== undefined) {
                return;
            } else {
                return this._register_entry(entry);
            }
        }).then(() => {
            return super.push(entry);
        }).then((compiled) => {
            return ajax(this._make_url('entry'), 'POST', compiled);
        });
    }

    private _register_entry(entry: Entry): Promise<any> {
        this._entry_registry[hash(entry)] = true;
        return ajax(this._make_url('register'), 'POST', {
            entry_type: (<any>entry.constructor).name, 
            columns: entry.columns
        });
    }

    private _submit_client_info(): Promise<any> {
        return this._client_info.loaded.then(info => {
            return ajax(this._make_url('client'), 'POST', info);
        });
    }

    private _make_url(command: string): string {
        return this._url_base + '/' + command;
    }
}


/**
 * Represents a basic database entry.
 */
class Entry {
    public client_id: string;
    public timestamp: number;

    public constructor(options) {
        var columns = this.columns;
        columns.forEach(column => {
            if (options[column] !== undefined) {
                this[column] = options[column];
            }
        });
    }

    public get columns(): string[] {
        return this._get_columns();
    }

    protected _get_columns(): string[] {
        return ['client_id'];
    }

    public validate(): void {
        this.columns.forEach(column => {
            if (this[column] === undefined) {
                throw Error('Entry attribute "' + column + '" is undefined.');
            }
        });
    }

    public to_dictionary(): any {
        var x: any = {};
        this.columns.forEach(column => {
            x[column] = this[column];
        });
        return x;
    }
}

class ClientEntry extends Entry {
    protected _get_columns(): string[] {
        return super._get_columns().concat(['sex']);
    }
}

class EventEntry extends Entry {
    protected _get_columns(): string[] {
        return super._get_columns().concat(['event_name', 'timestamp', 'browser', 'app', 'app_metadata']);
    }
}

class AppEventEntry extends EventEntry {
    protected _get_columns(): string[] {
        return super._get_columns().concat(['triggered_by', 'metadata']);
    }
}

class KBEventEntry extends EventEntry {
    protected _get_columns(): string[] {
        return super._get_columns().concat(['event_id', 'actionable', 'element_selector', 
            'alt_key', 'shift_key', 'meta_key', 'ctrl_key', 'key']);
    }
}

class MouseEventEntry extends EventEntry {
    protected _get_columns(): string[] {
        return super._get_columns().concat(['event_id', 'element_selector', 
            'button', 'client_x', 'client_y', 'screen_x', 'screen_y', 'alt_key', 
            'shift_key', 'meta_key', 'ctrl_key']);
    }
}

interface LoggedMouseEvent extends MouseEvent {
    logged_id: string;
}

interface LoggedKeyboardEvent extends KeyboardEvent {
    logged_id: string;
}

/**
 * Class used to monitor a Jupyter app.
 */
class Monitor {
    public loaded: Promise<any>;

    private _backend: BackendBase;
    private _app_name: string;

    public constructor(backend: BackendBase, app_name: string) {
        this._backend = backend;
        this._app_name = app_name;
        this.loaded = backend.loaded.then(() => {
            return Promise.resolve(this.register_events());
        });
    }

    public register_events(): void {
        this._register_mouse_events();
        this._register_keyboard_events();
        this._register_page_events();
    }
    
    public metadata(): any {
        var proto = window.location.href.split('://')[0];
        var address = window.location.href.split('://')[1];
        var command = address.split('?')[0].replace(/[a-zA-Z\-_0-9]+/g, 'X');
        var query = address.split('?')[1];
        return {url: proto + '://' + command + '?' + query};
    }

    public push(entry_class: new (...args: any[]) => Entry, options: any): Promise<any> {
        var all_options: any = {
            app: this._app_name,
            app_metadata: this.metadata(),
            browser: window.clientInformation.userAgent,
        };
        Object.keys(options).forEach(x => all_options[x] = options[x])

        var entry: Entry = new entry_class(all_options);
        return this._backend.push(entry).then(()=>entry);
    }

    protected get _interesting_keys(): string[] {
        return ['ctrl-c', 'ctrl-v', 'ctrl-x', 'ctrl-z', 'ctrl-y', 'ctrl-s',
            'ctrl-d', 'ctrl-f', 'ctrl-shift-f', 'ctrl-y', 'ctrl-g',
            'meta-c', 'meta-v', 'meta-x', 'meta-z', 'meta-y', 'meta-s',
            'meta-d', 'meta-f', 'meta-shift-f', 'meta-y', 'meta-g']
    }

    protected _register_page_events(): void {
        $(window)
            .focus(() => { 
                this.push(EventEntry, {
                    event_name: 'focus',
                    triggered_by: 0,
                });
            })
            .blur(() => { 
                this.push(EventEntry, {
                    event_name: 'blur',
                    triggered_by: 0,
                });
            })
    }

    protected _register_mouse_events(): void {
        $('body').click(e => this.push(MouseEventEntry, this._mouse_event('click', e)));
        $('body').dblclick(e => this.push(MouseEventEntry, this._mouse_event('dblclick', e)));
        // $('body').on('mouseover', e => this.push(MouseEventEntry, this._mouse_event('mouseover', e)));
        // $('body').on('mouseout', e => this.push(MouseEventEntry, this._mouse_event('mouseout', e)));
        // $('body').on('mousedown', e => this.push(MouseEventEntry, this._mouse_event('mousedown', e)));
        // $('body').on('mouseup', e => this.push(MouseEventEntry, this._mouse_event('mouseup', e)));
    }

    protected _register_keyboard_events(): void {
        $('body').keydown(e => {
            var key = keyboard.event_to_shortcut(e);
            if (this._interesting_keys.indexOf(key) !== -1) {
                this.push(KBEventEntry, this._keyboard_event('keydown', e));
            }
        });
    }

    protected _keyboard_event(name: string, e: LoggedKeyboardEvent, actionable?: boolean): any {
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
    }

    private _mouse_event(name: string, e: LoggedMouseEvent): any {
        e.logged_id = guid();
        return {
            event_name: name,
            event_id: e.logged_id || -1,
            element_selector: get_selector(<HTMLElement>e.target),
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
    }
}

/**
 * Class used to monitor the notebook app.
 */
class NotebookMonitor extends Monitor {
    public constructor(backend: BackendBase) {
        super(backend, 'notebook');
    }
    
    public metadata(): any {
        var num_cells = IPython.notebook.get_ncells();
        var cells: [string, number][] = [];
        for (var i=0; i<num_cells; i++) {

            var cell = IPython.notebook.get_cell(i);
            var type = cell.cell_type;
            var text = cell.get_text();
            var lines = text.split('\n');
            cells.push([type, lines]);
        }

        var metadata = super.metadata();
        metadata['cells'] = cells;

        var site = $('#site')[0];
        metadata['scroll_height'] = site.scrollHeight;
        metadata['scroll_top'] = site.scrollTop;

        metadata['mode'] = IPython.notebook.mode;
        metadata['active_cell'] = IPython.notebook.get_selected_index();
        return metadata;
    }

    public register_events(): void {
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
            } else if (this.mode === 'command') {
                handled = this.command_shortcuts.handles(e);
            }

            if (handled) {
                that.push(KBEventEntry, that._keyboard_event('keydown', e, true));
                return original_keydown.call(IPython.keyboard_manager, e);
            } else {
                var key = keyboard.event_to_shortcut(e);
                if (that._interesting_keys.indexOf(key) !== -1) {
                    that.push(KBEventEntry, that._keyboard_event('keydown', e, false));
                }
            }
            return true;
        };

        // Log actions.
        var hooked = IPython.keyboard_manager.actions.call;
        actions_mod.init.prototype.call = (name, e, env) => {
            hooked.call(IPython.keyboard_manager.actions, name, e, env);

            this.push(AppEventEntry, {
                event_name: 'action',
                triggered_by: e.logged_id || 0,
                metadata: { action_name: name },
            })
        }
    }
}

/**
 * Class used to monitor the tree (dashboard) app.
 */
class TreeMonitor extends Monitor {
    public constructor(backend: BackendBase) {
        super(backend, 'tree');
    }

    public register_events(): void {
        super.register_events();

        $("a[href=#running]").on('shown.bs.tab', e => {
            this.push(AppEventEntry, {
                event_name: 'running_tab',
                triggered_by: e.logged_id || -1,
                metadata: { },
            })
        });

        $("a[href=#notebooks]").on('shown.bs.tab', e => {
            this.push(AppEventEntry, {
                event_name: 'files_tab',
                triggered_by: e.logged_id || -1,
                metadata: { },
            })
        });

        $("a[href=#clusters]").on('shown.bs.tab', e => {
            this.push(AppEventEntry, {
                event_name: 'clusters_tab',
                triggered_by: e.logged_id || -1,
                metadata: { },
            })
        });
    }
}

/**
 * Class used to monitor the text editor app.
 */
class EditMonitor extends Monitor {
    public constructor(backend: BackendBase) {
        super(backend, 'edit');
    }
}

/**
 * Class used to monitor the terminal app.
 */
class TerminalMonitor extends Monitor {
    public constructor(backend: BackendBase) {
        super(backend, 'terminal');
    }
}

// Use require.js to asynchronously load the extension.
define([
    'jquery', 
    'services/config', 
    'base/js/utils', 
    'base/js/dialog', 
    'notebook/js/keyboardmanager',
    'notebook/js/actions',
    'base/js/keyboard'], 
function(
    loaded_jquery: any,
    loaded_configmod: any, 
    loaded_utils: any, 
    loaded_dialog: any,
    loaded_keyboardmanager_mod: any,
    loaded_actions_mod: any,
    loaded_keyboard: any) {
    
    $: loaded_jquery;
    configmod = loaded_configmod;
    utils = loaded_utils;
    dialog = loaded_dialog;
    keyboardmanager_mod = loaded_keyboardmanager_mod;
    actions_mod = loaded_actions_mod;
    keyboard = loaded_keyboard;
    keycodes = keyboard.keycodes;

    var monitor_class;
    if (document.getElementById("notebook")) {
        monitor_class = NotebookMonitor;
    } else if (document.getElementById("running")) {
        monitor_class = TreeMonitor;
    } else if (document.getElementById("terminado-container")) {
        monitor_class = TerminalMonitor;
    } else if (document.getElementById("texteditor-container")) {
        monitor_class = EditMonitor;
    } else {
        return; // Don't log unknown app.
    }

    log('Logger loaded. Connecting...');
    var config = new JupyterConfig('monitor');
    var client_info = new ClientInfo(config);
    var backend = new MongoDBBackend(client_info, url_base);

    log('Creating logger: ', monitor_class.name);
    var monitor = new monitor_class(backend);

    monitor.loaded.then(() => {
        log('Connected!');

        monitor.push(EventEntry, {
            event_name: 'loaded',
            triggered_by: 0,
        })
    }).catch((...args: any[]) => {
        log('Error connecting...', ...args);
    });
});
