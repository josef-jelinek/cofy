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
    return freeze_object([key, val, lo, hi, count, depth]);
  };

  var map_key = function (node) { return node[0]; };
  var map_val = function (node) { return node[1]; };
  var map_lo = function (node) { return node[2]; };
  var map_hi = function (node) { return node[3]; };
  var map_count = function (node) { return node === nil ? 0 : node[4]; };
  var map_depth = function (node) { return node === nil ? 0 : node[5]; };
  var map_with_lo_hi = function (node, lo, hi) { return map_node(map_key(node), map_val(node), lo, hi); };
  var map_with_lo = function (node, lo) { return map_with_lo_hi(node, lo, map_hi(node)); };
  var map_with_hi = function (node, hi) { return map_with_lo_hi(node, map_lo(node), hi); };

  var map_has = function (node, key, lt) {
    if (node === nil)
      return false;
    if (key === map_key(node))
      return true;
    var go_lo = lt && lt(key, map_key(node)) || !lt && key < map_key(node);
    return go_lo ? map_has(map_lo(node), key, lt) : map_has(map_hi(node), key, lt);
  };

  var map_get = function (node, key, fail, lt) {
    if (node === nil)
      return fail;
    if (key === map_key(node))
      return map_val(node);
    var go_lo = lt && lt(key, map_key(node)) || !lt && key < map_key(node);
    return go_lo ? map_get(map_lo(node), key, fail, lt) : map_get(map_hi(node), key, fail, lt);
  };

  var map_put = function (node, key, val, lt) {
    if (node === nil)
      return map_node(key, val);
    if (key === map_key(node) && val === map_val(node))
      return node;
    var lo = map_lo(node), hi = map_hi(node);
    if (key === map_key(node))
      return map_node(key, val, lo, hi);
    var sub, depth, go_lo = lt && lt(key, map_key(node)) || !lt && key < map_key(node);
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
    return map_with_hi(new_lo, map_with_lo(node, map_hi(new_lo)));
  };

  var map_rot_hi = function (node, new_hi) {
    return map_with_lo(new_hi, map_with_hi(node, map_lo(new_hi)));
  };

  var map_rm = function (node, key, lt) {
    if (node === nil)
      return nil;
    var lo = map_lo(node), hi = map_hi(node);
    if (key === map_key(node))
      return !lo || !hi ? lo || hi : (toss() ? map_rm_lo(node, key, lt) : map_rm_hi(node, key, lt));
    var sub, go_lo = lt && lt(key, map_key(node)) || !lt && key < map_key(node);
    if (go_lo) {
      sub = map_rm(lo, key, lt);
      return sub === lo ? node : map_with_lo(node, sub);
    }
    sub = map_rm(hi, key, lt);
    return sub === hi ? node : map_with_hi(node, sub);
  };

  var map_rm_lo = function (node, key, lt) {
    for (var lo = map_lo(node); map_hi(lo) !== nil; lo = map_hi(lo)) ;
    return map_with_lo_hi(lo, map_rm(map_lo(node), map_key(lo), lt), map_hi(node));
  };

  var map_rm_hi = function (node, key, lt) {
    for (var hi = map_hi(node); map_lo(hi) !== nil; hi = map_lo(hi)) ;
    return map_with_lo_hi(hi, map_lo(node), map_rm(map_hi(node), map_key(hi), lt));
  };

  var map_keys = function (node, a) {
    if (node !== nil) {
      map_keys(map_lo(node), a);
      a.push(map_key(node));
      map_keys(map_hi(node), a);
    }
    return a;
  };

  var map_values = function (node, a) {
    if (node !== nil) {
      map_values(map_lo(node), a);
      a.push(map_val(node));
      map_values(map_hi(node), a);
    }
    return a;
  };

  var map_to_object = function (node, o) {
    if (node !== nil) {
      map_to_object(map_lo(node), o);
      o[map_key(node)] = map_val(node);
      map_to_object(map_hi(node), o);
    }
    return o;
  };

  var map_print = function (node) {
    if (node === nil)
      return '';
    var s = map_print(map_lo(node)), t = map_print(map_hi(node));
    if (s !== '')
      s = s + ','
    if (t !== '')
      t = ',' + t;
    return s + ' ' + map_key(node) + ': ' + map_val(node) + t;
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

  var Nap = function (obj) {
    if (!is_nap(this))
      return new Nap(freeze_object(obj));
    this.contains = function (key) { return is_own(obj, key); };
    this.get = function (key, fail) { return is_own(obj, key) ? obj[key] : fail; };
    this.assoc = function (key, val) {
      var o = nap_copy(obj);
      o[key] = val;
      return Nap(o);
    };
    this.dissoc = function (key) {
      var o = nap_copy(obj);
      delete o[key];
      return Nap(o);
    };
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
    vector: create_vec
  });
}());
