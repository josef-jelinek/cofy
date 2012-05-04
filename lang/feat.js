// 2012-05-03 Persistent data structures for JavaScript
// Josef Jelinek josef.jelinek@gmail.com
// Public domain
var FEAT = (function (nil) {
  'use strict';

  var is_own = function (o, key) { return Object.prototype.hasOwnProperty.call(o, key); };
  var freeze_object = Object.freeze || function (o) { return o; };
  var toss = function () { return Math.random() < 0.5; };

  var map_node = function (key, val, lo, hi) {
    var count = 1 + map_count(lo) + map_count(hi);
    var depth = 1 + Math.max(map_depth(lo), map_depth(hi));
    return freeze_object({ key: key, val: val, lo: lo, hi: hi, count: count, depth: depth });
  };

  var map_count = function (node) { return node === nil ? 0 : node.count; };
  var map_depth = function (node) { return node === nil ? 0 : node.depth; };
  var map_with_lo_hi = function (node, lo, hi) { return map_node(node.key, node.val, lo, hi); };
  var map_with_lo = function (node, lo) { return map_with_lo_hi(node, lo, node.hi); };
  var map_with_hi = function (node, hi) { return map_with_lo_hi(node, node.lo, hi); };

  var map_has = function (node, key, lt) {
    if (node === nil)
      return false;
    if (key === node.key)
      return true;
    var go_lo = lt && lt(key, node.key) || !lt && key < node.key;
    return go_lo ? map_has(node.lo, key, lt) : map_has(node.hi, key, lt);
  };

  var map_get = function (node, key, fail, lt) {
    if (node === nil)
      return fail;
    if (key === node.key)
      return node.val;
    var go_lo = lt && lt(key, node.key) || !lt && key < node.key;
    return go_lo ? map_get(node.lo, key, fail, lt) : map_get(node.hi, key, fail, lt);
  };

  var map_put = function (node, key, val, lt) {
    if (node === nil)
      return map_node(key, val);
    if (key === node.key && val === node.val)
      return node;
    var lo = node.lo, hi = node.hi;
    if (key === node.key)
      return map_node(key, val, lo, hi);
    var sub, depth, go_lo = lt && lt(key, node.key) || !lt && key < node.key;
    if (go_lo) {
      sub = map_put(lo, key, val, lt);
      if (sub === node)
        return node;
      depth = map_depth(sub);
      return depth > map_depth(hi) + 1 ? map_rot_lo(node, sub) : map_with_lo(node, sub);
    }
    sub = map_put(hi, key, val, lt);
    if (sub === node)
      return node;
    depth = map_depth(sub);
    return depth > map_depth(lo) + 1 ? map_rot_hi(node, sub) : map_with_hi(node, sub);
  };

  var map_rot_lo = function (node, new_lo) {
    return map_with_hi(new_lo, map_with_lo(node, new_lo.hi));
  };

  var map_rot_hi = function (node, new_hi) {
    return map_with_lo(new_hi, map_with_hi(node, new_hi.lo));
  };

  var map_rm = function (node, key, lt) {
    if (node === nil)
      return nil;
    var lo = node.lo, hi = node.hi;
    if (key === node.key)
      return !lo || !hi ? lo || hi : (toss() ? map_rm_lo(node, key, lt) : map_rm_hi(node, key, lt));
    var sub, go_lo = lt && lt(key, node.key) || !lt && key < node.key;
    if (go_lo) {
      sub = map_rm(lo, key, lt);
      return sub === lo ? node : map_with_lo(node, sub);
    }
    sub = map_rm(hi, key, lt);
    return sub === hi ? node : map_with_hi(node, sub);
  };

  var map_rm_lo = function (node, key, lt) {
    for (var lo = node.lo; lo.hi !== nil; lo = lo.hi) ;
    return map_with_lo_hi(lo, map_rm(node.lo, lo.key, lt), node.hi);
  };

  var map_rm_hi = function (node, key, lt) {
    for (var hi = node.hi; hi.lo !== nil; hi = hi.lo) ;
    return map_with_lo_hi(hi, node.lo, map_rm(node.hi, hi.key, lt));
  };

  var map_keys = function (node, a) {
    if (node !== nil) {
      map_keys(node.lo, a);
      a.push(node.key);
      map_keys(node.hi, a);
    }
    return a;
  };

  var map_values = function (node, a) {
    if (node !== nil) {
      map_values(node.lo, a);
      a.push(node.val);
      map_values(node.hi, a);
    }
    return a;
  };

  var map_to_object = function (node, o) {
    if (node !== nil) {
      map_to_object(node.lo, o);
      o[node.key] = node.val;
      map_to_object(node.hi, o);
    }
    return o;
  };

  var map_print = function (node) {
    if (node === nil)
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
    this.count = function () { return map_count(node); };
    this.depth = function () { return map_depth(node); };
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

  var create_vec = function (arr) {
    return arr;
  };

  return freeze_object({
    map: create_map,
    nap: create_nap,
    assoc: nap_assoc,
    dissoc: nap_dissoc,
    vector: create_vec
  });
}());
