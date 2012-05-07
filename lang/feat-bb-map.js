// 2012-05-05 Persistent Binary B-Tree based map for JavaScript
// Josef Jelinek josef.jelinek@gmail.com
// Public domain
var FEAT_BB = (function (nil) {
  'use strict';

  var is_own = function (o, key) { return Object.prototype.hasOwnProperty.call(o, key); };
  var freeze_object = Object.freeze || function (o) { return o; };

  var new_node = function (key, val, lev, lo, hi) {
    return freeze_object({ key: key, val: val, lev: lev, lo: lo, hi: hi });
  };

  var go_lo = function (node, lt) { return lt && lt(key, node.key) || !lt && key < node.key; };

  var has = function (node, key, lt) {
    while (node) {
      if (key === node.key)
        return true;
      node = go_lo(node, key, lt) ? node.lo : node.hi;
    }
    return false;
  };

  var get = function (node, key, fail, lt) {
    while (node) {
      if (key === node.key)
        return node.val;
      node = go_lo(node, key, lt) ? node.lo : node.hi;
    }
    return fail;
  };

  var put = function (node, key, val, lt) {
  };

  var rm = function (node, key, lt) {
  };

  var skew = function (node) {
    if (!node || !node.lo || node.lev > node.lo.lev)
      return node;
    var lo = node.lo, new_hi = new_node(node.key, node.val, node.lev, lo.hi, node.hi);
    return new_node(lo.key, lo.val, lo.lev, lo.lo, new_hi);
  };

  var split = function (node) {
    if (!node || !node.hi || !node.hi.hi || node.lev > node.hi.hi.lev)
      return node;
    var hi = node.hi, new_lo = new_node(node.key, node.val, node.lev, node.lo, hi.lo);
    return new_node(hi.key, hi.val, hi.lev + 1, new_lo, hi.hi);
  };

  var keys = function (node, a) {
    if (node !== nil) {
      keys(node.lo, a);
      a.push(node.key);
      keys(node.hi, a);
    }
    return a;
  };

  var values = function (node, a) {
    if (node !== nil) {
      values(node.lo, a);
      a.push(node.val);
      values(node.hi, a);
    }
    return a;
  };

  var to_object = function (node, o) {
    if (node !== nil) {
      to_object(node.lo, o);
      o[node.key] = node.val;
      to_object(node.hi, o);
    }
    return o;
  };

  var print = function (node) {
    if (node === nil)
      return '';
    var s = print(node.lo), t = print(node.hi);
    if (s !== '')
      s = s + ','
    if (t !== '')
      t = ',' + t;
    return s + ' ' + node.key + ': ' + node.val + t;
  };

  var Map = function (node, lt) {
    if (!is_map(this))
      return new Map(node, lt);
    this.contains = function (key) { return has(node, key, lt); };
    this.get = function (key, fail) { return get(node, key, fail, lt); };
    this.assoc = function (key, val) { return create_if_new(this, node, put(node, key, val, lt), lt); };
    this.dissoc = function (key) { return create_if_new(this, node, rm(node, key, lt), lt); };
    this.keys = function (into) { return keys(node, into || []); };
    this.values = function (into) { return values(node, into || []); };
    this.toObject = function (into) { return to_object(node, into || {}); };
    this.toString = function () { return '{' + print(node) + ' }'; };
    freeze_object(this);
  };

  var is_map = function (x) { return x instanceof Map; };

  var create_if_new = function (map, node, new_node, lt) {
    return node === new_node ? map : Map(new_node, lt);
  };

  var create = function (obj, lt) {
    var key, map = Map(nil, lt);
    for (key in obj)
      if (is_own(obj, key))
        map = map.assoc(key, obj[key]);
    return map;
  };

  return freeze_object({
    map: create
  });
}());
