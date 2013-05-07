// Persistent vector based on a shallow native-array tree
// Josef Jelinek josef.jelinek@gmail.com
// Public domain

/*globals MODULE */
/*jslint es5: true, bitwise:true */

MODULE.define('feat/vector', [], function () {
    'use strict';

    var Vec, tree_depth, get, set, push, pop, to_array, print,
        node_log_size = 4, node_size = (1 << node_log_size);

    Vec = function (node, count) {
        var depth = tree_depth(count);
        this.count = function () { return count; };
        this.get = function (i) { return get(node, i, depth); };

        this.set = function (i, val) {
            return i === count ? new Vec(push(node, val, count, depth), count + 1)
                               : new Vec(set(node, i, val, depth), count);
        };

        this.push = function (val) { return new Vec(push(node, val, count, depth), count + 1); };
        this.pop = function () { return count > 0 ? new Vec(pop(node, count, depth), count - 1) : this; };
        this.toArray = function (into) { return to_array(node, depth, into || []); };
        this.toString = function () { return '[' + print(node, depth) + ']'; };
    };

    tree_depth = function (count) {
        var depth = count > 0 ? 1 : 0;
        while (count - 1 >> depth * node_log_size > 0) {
            depth += 1;
        }
        return depth;
    };

    get = function (node, i, depth) {
        while (depth > 0) {
            depth -= 1;
            node = node[i >> node_log_size * depth & node_size - 1];
        }
        return node;
    };

    set = function (node, i, val, depth) {
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
});
