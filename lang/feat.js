// Persistent data structures for JavaScript
//
// 2012-05-03 Persistent sorted map / copy-on-write map
// 2012-11-13 Persistent vector
//
// Josef Jelinek josef.jelinek@gmail.com
// Public domain
/*jslint bitwise:true */
var FEAT = (function (nil) {
    'use strict';

    var vector, map, nap,
        is_own = function (o, key) { return Object.prototype.hasOwnProperty.call(o, key); },
        freeze_object = Object.freeze || function (o) { return o; };

    // Persistent vector based on a shallow native-array tree
    vector = (function () {
        var Vec, tree_depth, get, set, push, pop, to_array, print,
            node_log_size = 4,
            node_size = (1 << node_log_size);

        Vec = function (node, count) {
            var depth = tree_depth(count);
            this.count = function () { return count; };
            this.get = function (i) { return get(node, i, count, depth); };

            this.set = function (i, val) {
                return i === count ? new Vec(push(node, val, count, depth), count + 1)
                                   : new Vec(set(node, i, val, count, depth), count);
            };

            this.push = function (val) { return new Vec(push(node, val, count, depth), count + 1); };
            this.pop = function () { return count > 0 ? new Vec(pop(node, count, depth), count - 1) : this; };
            this.toArray = function (into) { return to_array(node, depth, into || []); };
            this.toString = function () { return '[' + print(node, depth) + ']'; };
            freeze_object(this);
        };

        tree_depth = function (count) {
            var depth = count > 0 ? 1 : 0;
            while (count - 1 >> depth * node_log_size > 0) {
                depth += 1;
            }
            return depth;
        };

        get = function (node, i, count, depth) {
            while (depth > 0) {
                depth -= 1;
                node = node[i >> node_log_size * depth & node_size - 1];
            }
            return node;
        };

        set = function (node, i, val, count, depth) {
            var pos, n;
            n = node = node.slice(0);
            while (depth > 1) {
                depth -= 1;
                pos = i >> node_log_size * depth & node_size - 1;
                n = n[pos] = n[pos].slice(0);
            }
            n[i & node_size - 1] = val;
            return node;
        };

        push = function (node, val, count, depth) {
            var i, pos, n, new_depth;
            if (count === 0) {
                return [val];
            }
            new_depth = tree_depth(count + 1);
            if (depth < new_depth) {
                for (i = 0; i < depth; i += 1) {
                    val = [val];
                }
                return [node, val];
            }
            node = n = node.slice(0);
            while (depth > 1) {
                depth -= 1;
                pos = (count >> node_log_size * depth) & node_size - 1;
                n = n[pos] = pos < n.length ? n[pos].slice(0) : [];
            }
            n[count & node_size - 1] = val;
            return node;
        };

        pop = function (node, count, depth) {
            var pos, n, new_depth;
            if (count === 1) {
                return [];
            }
            new_depth = tree_depth(count - 1);
            if (depth > new_depth) {
                return node[0];
            }
            node = n = node.slice(0);
            while (depth > 1) {
                depth -= 1;
                pos = (count - 1 >> node_log_size * depth) & node_size - 1;
                n = n[pos] = n[pos].slice(0);
            }
            n.pop();
            return node;
        };

        to_array = function (node, depth, a) {
            var i;
            if (depth > 0 && node && node.length > 0) {
                if (depth === 1) {
                    for (i = 0; i < node.length; i += 1) {
                        a.push(node[i]);
                    }
                } else {
                    for (i = 0; i < node.length; i += 1) {
                        to_array(node[i], depth - 1, a);
                    }
                }
            }
            return a;
        };

        print = function (node, depth) {
            return to_array(node, depth, []).join(', ');
        };

        return {

            create: function (arr) {
                var i, len = arr ? arr.length : 0, vec = new Vec([], 0);
                for (i = 0; i < len; i += 1) {
                    vec = vec.push(arr[i]);
                }
                return vec;
            }
        };
    }());

    // Persistent sorted map based on a binary balanced trees (aka AA trees)
    map = (function () {
        var Map, create_if_new, new_node, with_lev, with_lo_hi, with_lo, with_hi, go_lo,
            has, get, put, rm, skew, split, keys, values, to_object, print;

        Map = function (node, lt) {
            this.count = function () { return node ? node.count : 0; };
            this.contains = function (key) { return has(node, key, lt); };
            this.get = function (key, fail) { return get(node, key, fail, lt); };
            this.assoc = function (key, val) { return create_if_new(this, node, put(node, key, val, lt), lt); };
            this.dissoc = function (key) { return create_if_new(this, node, rm(node, key, lt), lt); };
            this.keys = function (into) { return keys(node, into || []); };
            this.values = function (into) { return values(node, into || []); };
            this.toObject = function (into) { return to_object(node, into || {}); };
            this.toString = function () { return node ? '{ ' + print(node) + ' }' : '{}'; };
            freeze_object(this);
        };

        create_if_new = function (map, node, new_node, lt) {
            return node === new_node ? map : new Map(new_node, lt);
        };

        new_node = function (key, val, lev, lo, hi) {
            var count = 1 + (lo ? lo.count : 0) + (hi ? hi.count : 0);
            return freeze_object({ key: key, val: val, lev: lev, lo: lo, hi: hi, count: count });
        };

        with_lev = function (node, lev) { return new_node(node.key, node.val, lev, node.lo, node.hi); };
        with_lo_hi = function (node, lo, hi) { return new_node(node.key, node.val, node.lev, lo, hi); };
        with_lo = function (node, lo) { return lo === node.lo ? node : with_lo_hi(node, lo, node.hi); };
        with_hi = function (node, hi) { return hi === node.hi ? node : with_lo_hi(node, node.lo, hi); };
        go_lo = function (node, key, lt) { return (lt && lt(key, node.key)) || (!lt && key < node.key); };

        has = function (node, key, lt) {
            while (node) {
                if (key === node.key) {
                    return true;
                }
                node = go_lo(node, key, lt) ? node.lo : node.hi;
            }
            return false;
        };

        get = function (node, key, fail, lt) {
            while (node) {
                if (key === node.key) {
                    return node.val;
                }
                node = go_lo(node, key, lt) ? node.lo : node.hi;
            }
            return fail;
        };

        put = function (node, key, val, lt) {
            if (!node) {
                return new_node(key, val, 0);
            }
            if (key === node.key) {
                return val === node.val ? node : new_node(key, val, node.lev, node.lo, node.hi);
            }
            node = go_lo(node, key, lt) ? skew(node, put(node.lo, key, val, lt))
                                        : skew(with_hi(node, put(node.hi, key, val, lt)));
            return split(node);
        };

        rm = function (node, key, lt) {
            if (node) {
                var lo = node.lo, hi = node.hi, hi_lo, lev = node.lev;
                if (key === node.key) {
                    if (!lo || !hi) {
                        return lo || hi;
                    }
                    hi_lo = hi;
                    while (hi_lo.lo) { // find replacement
                        hi_lo = hi_lo.lo;
                    }
                    node = new_node(hi_lo.key, hi_lo.val, lev, lo, hi = rm(hi, hi_lo.key, lt));
                } else {
                    node = go_lo(node, key, lt) ? with_lo(node, lo = rm(lo, key, lt)) : with_hi(node, hi = rm(hi, key, lt));
                }
                if ((lo && lo.lev < lev - 1) || (hi && hi.lev < lev - 1)) {
                    node = new_node(node.key, node.val, lev - 1, lo, hi && hi.lev > lev ? with_lev(hi, lev - 1) : hi);
                    node = skew(node);
                    if (node.hi) {
                        node = with_hi(node, skew(node.hi));
                    }
                    if (node.hi && node.hi.hi) {
                        node = with_hi(node, with_hi(node.hi, skew(node.hi.hi)));
                    }
                    node = split(node);
                    if (node.hi) {
                        node = with_hi(node, split(node.hi));
                    }
                }
            }
            return node;
        };

        skew = function (node, lo) {
            lo = lo || node.lo;
            return !lo || node.lev > lo.lev ? with_lo(node, lo) : with_hi(lo, with_lo(node, lo.hi));
        };

        split = function (node) {
            var hi = node.hi;
            return !hi || !hi.hi || node.lev > hi.hi.lev ? node : new_node(hi.key, hi.val, hi.lev + 1, with_hi(node, hi.lo), hi.hi);
        };

        keys = function (node, a) {
            if (node) {
                keys(node.lo, a);
                a.push(node.key);
                keys(node.hi, a);
            }
            return a;
        };

        values = function (node, a) {
            if (node) {
                values(node.lo, a);
                a.push(node.val);
                values(node.hi, a);
            }
            return a;
        };

        to_object = function (node, o) {
            if (node) {
                to_object(node.lo, o);
                o[node.key] = node.val;
                to_object(node.hi, o);
            }
            return o;
        };

        print = function (node) {
            if (!node) {
                return '';
            }
            var s = print(node.lo), t = print(node.hi);
            if (s !== '') {
                s = s + ', ';
            }
            if (t !== '') {
                t = ', ' + t;
            }
            return s + node.key + ': ' + node.val + t;
        };

        return {

            create: function (obj, lt) {
                var key, map = new Map(nil, lt);
                for (key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        map = map.assoc(key, obj[key]);
                    }
                }
                return map;
            }
        };
    }());

    // Naive copy-on-write persistent map on top of the native object
    nap = (function () {
        var Nap, copy, assoc, dissoc;

        Nap = function (obj) {
            this.contains = function (key) { return is_own(obj, key); };
            this.get = function (key, fail) { return is_own(obj, key) ? obj[key] : fail; };
            this.assoc = function (key, val) { return new Nap(assoc(obj, key, val)); };
            this.dissoc = function (key) { return new Nap(dissoc(obj, key)); };
            this.toObject = function (into) { return copy(obj, into); };
            freeze_object(this);
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
            return freeze_object(o);
        };

        dissoc = function (obj, key) {
            var o = copy(obj);
            delete o[key];
            return freeze_object(o);
        };

        return {

            create: function (obj) {
                return new Nap(copy(obj));
            },

            assoc: assoc,
            dissoc: dissoc
        };
    }());

    return freeze_object({
        vector: vector.create,
        map: map.create,
        nap: nap.create,
        assoc: nap.assoc,
        dissoc: nap.dissoc
    });
}());
