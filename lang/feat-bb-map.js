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

  var with_lev = function (node, lev) { return new_node(node.key, node.val, lev, node.lo, node.hi); };
  var with_lo_hi = function (node, lo, hi) { return new_node(node.key, node.val, node.lev, lo, hi); };
  var with_lo = function (node, lo) { return lo === node.lo ? node : with_lo_hi(node, lo, node.hi); };
  var with_hi = function (node, hi) { return hi === node.hi ? node : with_lo_hi(node, node.lo, hi); };
  var go_lo = function (node, key, lt) { return lt && lt(key, node.key) || !lt && key < node.key; };

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
    if (!node)
      return new_node(key, val, 0);
    if (key === node.key)
      return val === node.val ? node : new_node(key, val, node.lev, node.lo, node.hi);
    node = go_lo(node, key, lt) ? skew(node, put(node.lo, key, val, lt)) : skew(with_hi(node, put(node.hi, key, val, lt)));
    return split(node);
  };

  var rm = function (node, key, lt) {
    if (node) {
      var lo = node.lo, hi = node.hi, hi_lo, lev = node.lev;
      if (key === node.key) {
        if (!lo || !hi)
          return lo || hi;
        for (hi_lo = hi; hi_lo.lo; hi_lo = hi_lo.lo) ; // find replacement
        node = new_node(hi_lo.key, hi_lo.val, lev, lo, hi = rm(hi, hi_lo.key, lt));
      } else {
        node = go_lo(node, key, lt) ? with_lo(node, lo = rm(lo, key, lt)) : with_hi(node, hi = rm(hi, key, lt));
      }
      if (lo && lo.lev < lev - 1 || hi && hi.lev < lev - 1) {
        node = new_node(node.key, node.val, lev - 1, lo, hi && hi.lev > lev ? with_lev(hi, lev - 1) : hi);
        node = skew(node);
        if (node.hi)
          node = with_hi(node, skew(node.hi));
        if (node.hi && node.hi.hi)
          node = with_hi(node, with_hi(node.hi, skew(node.hi.hi)));
        node = split(node);
        if (node.hi)
          node = with_hi(node, split(node.hi));
      }
    }
    return node;
  };

  var skew = function (node, lo) {
    lo = lo || node.lo;
    return !lo || node.lev > lo.lev ? with_lo(node, lo) : with_hi(lo, with_lo(node, lo.hi));
  };

  var split = function (node) {
    var hi = node.hi;
    return !hi || !hi.hi || node.lev > hi.hi.lev ? node : new_node(hi.key, hi.val, hi.lev + 1, with_hi(node, hi.lo), hi.hi);
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
