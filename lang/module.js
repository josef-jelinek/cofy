// Trivial module system inspired by AMD
// Josef Jelinek josef.jelinek@gmail.com
// Public domain

/*globals MODULE, Boolean */
/*jslint es5: true */

var MODULE = (function () {
    'use strict';
    var defs, reqs, mods, reset, resolve, try_use;

    reset = function () {
        defs = {};
        reqs = [];
        mods = {};
    };

    resolve = function (mod_names) {
        var i, name, res, sub_mods = [];
        for (i = 0; i < mod_names.length; i += 1) {
            name = mod_names[i];
            if (!mods[name] && defs[name]) {
                res = resolve(defs[name][1]);
                if (res) {
                    mods[name] = defs[name][0].apply(null, res);
                    delete defs[name];
                }
            }
            sub_mods[i] = mods[name];
        }
        return sub_mods.every(Boolean) ? sub_mods : null;
    };

    try_use = function () {
        var i, res, new_reqs = [];
        for (i = 0; i < reqs.length; i += 1) {
            res = resolve(reqs[i][1]);
            if (res) {
                reqs[i][0].apply(null, res);
            } else {
                new_reqs.push(reqs[i]);
            }
        }
        reqs = new_reqs;
    };

    reset();
    return {
        reset: reset,

        use: function (mod_names, fn) {
            reqs.push([fn, mod_names]);
            try_use();
        },

        define: function (name, mod_names, fn) {
            defs[name] = defs[name] || [fn, mod_names];
            try_use();
        }
    };
}());
