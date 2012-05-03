var FEAT = (function (nil) {
  'use strict';

  var is_own = function (o, key) { return Object.prototype.hasOwnProperty.call(o, key); };
  var freeze_object = Object.freeze || function (o) { return o; };
  var toss = function () { return Math.random() < 0.5; };

  var map_node = function (key, val, lo, hi) {
    var count = map_count(lo) + map_count(hi) + (key !== nil ? 1 : 0);
    return freeze_object([key, val, lo, hi, count]);
  };

  var map_key = function (node) { return node[0]; };
  var map_val = function (node) { return node[1]; };
  var map_lo = function (node) { return node[2]; };
  var map_hi = function (node) { return node[3]; };
  var map_count = function (node) { return node === nil ? 0 : node[4]; };
  var map_with_lo = function (node, lo) { return map_node(map_key(node), map_val(node), lo, map_hi(node)); };
  var map_with_hi = function (node, hi) { return map_node(map_key(node), map_val(node), map_lo(node), hi); };

  var map_get = function (node, key) {
    if (node === nil)
      return nil;
    if (key === map_key(node))
      return map_val(node);
    return key < map_key(node) ? map_get(map_lo(node), key) : map_get(map_hi(node), key);
  };

  var map_assoc = function (node, key, val) {
    if (node === nil)
      return map_node(key, val);
    if (key === map_key(node) && val === map_val(node))
      return node;
    if (key === map_key(node))
      return map_node(key, val, map_lo(node), map_hi(node));
    var sub;
    if (key < map_key(node)) {
      sub = map_assoc(map_lo(node), key, val);
      return sub === map_lo(node) ? node : map_with_lo(node, sub);
    }
    sub = map_assoc(map_hi(node), key, val);
    return sub === map_hi(node) ? node : map_with_hi(node, sub);
  };

  var map_dissoc = function (node, key) {
    if (node === nil)
      return nil;
    if (key === map_key(node)) {
      if (!map_lo(node) || !map_hi(node))
        return map_lo(node) || map_hi(node);
      return toss() ? map_dissoc_lo(node, key) : map_dissoc_hi(node, key);
    }
    var sub;
    if (key < map_key(node)) {
      sub = map_dissoc(map_lo(node), key);
      return sub === map_lo(node) ? node : map_with_lo(node, sub);
    }
    sub = map_dissoc(map_hi(node), key);
    return sub === map_hi(node) ? node : map_with_hi(node, sub);
  };

  var map_dissoc_lo = function (node, key) {
    var lo = map_lo(node);
    while (map_hi(lo) !== nil)
      lo = map_hi(lo);
    return map_node(map_key(lo), map_val(lo), map_dissoc(map_lo(node), map_key(lo)), map_hi(node));
  };

  var map_dissoc_hi = function (node, key) {
    var hi = map_hi(node);
    while (map_lo(hi) !== nil)
      hi = map_lo(hi);
    return map_node(map_key(hi), map_val(hi), map_lo(node), map_dissoc(map_hi(node), map_key(hi)));
  };

  var map_print = function (node) {
    if (node === nil)
      return '-';
    return '(' + map_print(map_lo(node)) + ' ' + map_key(node) + ' ' + map_print(map_hi(node)) + ')';
  };

  var Map = function (node) {
    if (!is_map(this))
      return new Map(node);
    this.count = function () { return map_count(node); };
    this.assoc = function (key, val) {
      return create_map_if_new(this, node, map_assoc(node, key, val));
    };
    this.dissoc = function (key) {
      return create_map_if_new(this, node, map_dissoc(node, key));
    };
    this.get = function (key) { return map_get(node, key); };
    this.toString = function () { return map_print(node); };
    freeze_object(this);
  };

  var is_map = function (x) { return x instanceof Map; };

  var create_map_if_new = function (map, node, new_node) {
    return node === new_node ? map : Map(new_node);
  };

  var create_map = function (obj) {
    var map = Map(), key;
    for (key in obj)
      if (is_own(obj, key))
        map = map.assoc(key, obj[key]);
    return map;
  };

  return {
    map: create_map
  };
}());
