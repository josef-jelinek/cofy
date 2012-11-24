// Naive copy-on-write persistent map on top of the native object
// Josef Jelinek josef.jelinek@gmail.com
// Public domain
var FEAT;

(function () {
    'use strict';

    var Map, copy, assoc, dissoc, to_pair_array, print;

    Map = function (obj) {
        this.contains = function (key) { return Object.prototype.hasOwnProperty.call(obj, key); };
        this.get = function (key, fail) { return this.contains(key) ? obj[key] : fail; };
        this.assoc = function (key, val) { return new Map(assoc(obj, key, val)); };
        this.dissoc = function (key) { return new Map(dissoc(obj, key)); };
        this.toObject = function (into) { return copy(obj, into); };
        this.toString = function () { return print(obj); };
    };

    copy = function (obj, into) {
        var key, o = into || {};
        if (obj) {
            for (key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    o[key] = obj[key];
                }
            }
        }
        return o;
    };

    assoc = function (obj, key, val) {
        var o = copy(obj);
        o[key] = val;
        return o;
    };

    dissoc = function (obj, key) {
        var o = copy(obj);
        delete o[key];
        return o;
    };

    to_pair_array = function (obj, a) {
        var key;
        for (key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                a.push(key + ': ' + obj[key]);
            }
        }
        return a;
    };

    print = function (obj) {
        var a = to_pair_array(obj, []);
        return a.length > 0 ? '{ ' + a.join(', ') + ' }' : '{}';
    };

    if (!FEAT) {
        FEAT = {};
    }
    if (!FEAT.cowMap) {
        FEAT.cowMap = function (obj) {
            return new Map(copy(obj));
        };
    }
    if (!FEAT.assoc) {
        FEAT.assoc = assoc;
    }
    if (!FEAT.dissoc) {
        FEAT.dissoc = dissoc;
    }
}());
