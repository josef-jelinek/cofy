// 2012-05-03 Persistent data structures for JavaScript
// Josef Jelinek josef.jelinek@gmail.com
// Public domain
var FEAT = (function (nil) {
  'use strict';

  var is_own = function (o, key) { return Object.prototype.hasOwnProperty.call(o, key); };
  var freeze_object = Object.freeze || function (o) { return o; };

  var map_node = function (key, val, lo, hi) {
    var count = 1 + (lo ? lo.count : 0) + (hi ? hi.count : 0);
    var depth = 1 + Math.max(lo ? lo.depth : 0, hi ? hi.depth : 0);
    return freeze_object({ key: key, val: val, lo: lo, hi: hi, count: count, depth: depth });
  };

  var map_with_lo_hi = function (node, lo, hi) { return node.lo === lo && node.hi === hi ? node : map_node(node.key, node.val, lo, hi); };
  var map_with_lo = function (node, lo) { return map_with_lo_hi(node, lo, node.hi); };
  var map_with_hi = function (node, hi) { return map_with_lo_hi(node, node.lo, hi); };
  var map_go_lo = function (node, key, lt) { return lt && lt(key, node.key) || !lt && key < node.key; };

  var map_has = function (node, key, lt) {
    while (node) {
      if (key === node.key)
        return true;
      node = map_go_lo(node, key, lt) ? node.lo : node.hi;
    }
    return false;
  };

  var map_get = function (node, key, fail, lt) {
    while (node) {
      if (key === node.key)
        return node.val;
      node = map_go_lo(node, key, lt) ? node.lo : node.hi;
    }
    return fail;
  };

  var map_put = function (node, key, val, lt) {
    if (!node)
      return map_node(key, val);
    if (key === node.key && val === node.val)
      return node;
    var lo = node.lo, hi = node.hi;
    if (key === node.key)
      return map_node(key, val, lo, hi);
    if (map_go_lo(node, key, lt)) {
      var new_lo = map_put(lo, key, val, lt);
      if (new_lo === lo)
        return node;
      if (new_lo.depth > (hi ? hi.depth + 1 : 1)) // rotate right
        return map_with_hi(new_lo, map_with_lo(node, new_lo.hi));
      return map_with_lo(node, new_lo);
    }
    var new_hi = map_put(hi, key, val, lt);
    if (new_hi === hi)
      return node;
    if (new_hi.depth > (lo ? lo.depth + 1 : 1)) // rotate left
      return map_with_lo(new_hi, map_with_hi(node, new_hi.lo));
    return map_with_hi(node, new_hi);
  };

  var map_rm = function (node, key, lt) {
    if (!node)
      return node;
    var lo = node.lo, hi = node.hi, new_hi, new_lo, hi_lo;
    if (key === node.key) {
      if (!lo || !hi)
        return lo || hi;
      for (hi_lo = hi; hi_lo.lo; hi_lo = hi_lo.lo) ; // find replacement
      new_hi = map_rm(hi, hi_lo.key, lt);
      if (lo && (new_hi ? new_hi.depth : 0) < lo.depth - 1) // rotate right
        return map_with_hi(lo, map_with_lo_hi(hi_lo, lo.hi, new_hi));
      return map_with_lo_hi(hi_lo, lo, new_hi);
    }
    if (map_go_lo(node, key, lt)) {
      new_lo = map_rm(lo, key, lt);
      if (new_lo === lo)
        return node;
      if (hi && (new_lo ? new_lo.depth : 0) < hi.depth - 1) // rotate left
        return map_with_lo(hi, map_with_lo_hi(node, new_lo, hi.lo));
      return map_with_lo(node, new_lo);
    }
    new_hi = map_rm(hi, key, lt);
    if (new_hi === hi)
      return node;
    if (lo && (new_hi ? new_hi.depth : 0) < lo.depth - 1) // rotate right
      return map_with_hi(lo, map_with_lo_hi(node, lo.hi, new_hi));
    return map_with_hi(node, new_hi);
  };

  var map_keys = function (node, a) {
    if (node) {
      map_keys(node.lo, a);
      a.push(node.key);
      map_keys(node.hi, a);
    }
    return a;
  };

  var map_values = function (node, a) {
    if (node) {
      map_values(node.lo, a);
      a.push(node.val);
      map_values(node.hi, a);
    }
    return a;
  };

  var map_to_object = function (node, o) {
    if (node) {
      map_to_object(node.lo, o);
      o[node.key] = node.val;
      map_to_object(node.hi, o);
    }
    return o;
  };

  var map_print = function (node) {
    if (!node)
      return '';
    var s = map_print(node.lo), t = map_print(node.hi);
    if (s !== '')
      s = s + ','
    if (t !== '')
      t = ',' + t;
    return s + ' ' + node.key + ': ' + node.val + t;
  };

  var Map = function (node, lt) {
    if (!is_map(this))
      return new Map(node, lt);
    this.count = function () { return node ? node.count : 0; };
    this.depth = function () { return node ? node.depth : 0; };
    this.contains = function (key) { return map_has(node, key, lt); };
    this.get = function (key, fail) { return map_get(node, key, fail, lt); };
    this.assoc = function (key, val) { return create_map_if_new(this, node, map_put(node, key, val, lt), lt); };
    this.dissoc = function (key) { return create_map_if_new(this, node, map_rm(node, key, lt), lt); };
    this.keys = function (into) { return map_keys(node, into || []); };
    this.values = function (into) { return map_values(node, into || []); };
    this.toObject = function (into) { return map_to_object(node, into || {}); };
    this.toString = function () { return '{' + map_print(node) + ' }'; };
    freeze_object(this);
  };

  var is_map = function (x) { return x instanceof Map; };

  var create_map_if_new = function (map, node, new_node, lt) {
    return node === new_node ? map : Map(new_node, lt);
  };

  var create_map = function (obj, lt) {
    var key, map = Map(nil, lt);
    for (key in obj)
      if (is_own(obj, key))
        map = map.assoc(key, obj[key]);
    return map;
  };

  var nap_copy = function (obj) {
    var key, o = {};
    if (obj)
      for (key in obj)
        if (is_own(obj, key))
          o[key] = obj[key];
    return o;
  };

  var nap_assoc = function (obj, key, val) {
    var o = nap_copy(obj);
    o[key] = val;
    return freeze_object(o);
  };

  var nap_dissoc = function (obj, key) {
    var o = nap_copy(obj);
    delete o[key];
    return freeze_object(o);
  };

  var Nap = function (obj) {
    if (!is_nap(this))
      return new Nap(freeze_object(obj));
    this.contains = function (key) { return is_own(obj, key); };
    this.get = function (key, fail) { return is_own(obj, key) ? obj[key] : fail; };
    this.assoc = function (key, val) { return Nap(nap_assoc(obj, key, val)); };
    this.dissoc = function (key) { return Nap(nap_dissoc(obj, key)); };
    this.toObject = function (into) { return nap_copy(obj); };
    freeze_object(this);
  };

  var is_nap = function (x) { return x instanceof Nap; };

  var create_nap = function (obj) {
    return Nap(nap_copy(obj));
  };

  return freeze_object({
    map: create_map,
    nap: create_nap,
    assoc: nap_assoc,
    dissoc: nap_dissoc
  });
}());
