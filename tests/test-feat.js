/*global FEAT */
var TESTS = (function (nil) {
    'use strict';
    return {
        sorted_map: {

            create_empty: function () {
                this.is.same(FEAT.sortedMap().count(), 0);
                this.is.same(FEAT.sortedMap({}).count(), 0);
            },

            create_from_object: function () {
                var map = FEAT.sortedMap({a: 1, b: 2});
                this.is.same(map.get('a'), 1);
                this.is.same(map.get('b'), 2);
                this.is.undefined(map.get('c'));
                this.is.same(map.get('c', 3), 3);
                this.is.true(map.contains('a'));
                this.is.true(map.contains('b'));
                this.is.false(map.contains('c'));
            },

            adding_items: function () {
                var i, a = ['y', 'a', 'c', 'z', 'b', 'x'],
                    map1 = FEAT.sortedMap(),
                    map2 = map1;
                for (i = 0; i < a.length; i += 1) {
                    map2 = map2.assoc(a[i], i + 1);
                }
                this.is.same(map1.count(), 0);
                this.is.same(map2.count(), a.length);
                for (i = 0; i < a.length; i += 1) {
                    this.is.same(map2.get(a[i]), i + 1);
                }
            },

            removing_items: function () {
                var i, a = ['c', 'z', 'y', 'a', 'x', 'b'],
                    map1 = FEAT.sortedMap(),
                    map2;
                for (i = 0; i < a.length; i += 1) {
                    map1 = map1.assoc(a[i], i + 1);
                }
                map2 = map1;
                for (i = 0; i < Math.round(a.length / 2); i += 1) {
                    map2 = map2.dissoc(a[i]);
                }
                this.is.same(map2.count(), Math.round(a.length / 2));
                for (i = 0; i < Math.round(a.length / 2); i += 1) {
                    this.is.undefined(map2.get(a[i]));
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    this.is.same(map2.get(a[i]), i + 1);
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    map2 = map2.dissoc(a[i]);
                }
                this.is.same(map1.count(), a.length);
                this.is.same(map2.count(), 0);
                for (i = 0; i < a.length; i += 1) {
                    this.is.undefined(map2.get(a[i]));
                }
            },

            convert_to_object: function () {
                var key, o1 = { a: 1, b: 2, c: 3 }, o2 = FEAT.sortedMap(o1).toObject();
                this.is.not.same(o1, o2);
                for (key in o1) {
                    if (Object.prototype.hasOwnProperty.call(o1, key)) {
                        this.is.same(o1[key], o2[key]);
                    }
                }
                for (key in o2) {
                    if (Object.prototype.hasOwnProperty.call(o2, key)) {
                        this.is.same(o2[key], o1[key]);
                    }
                }
            },

            convert_to_string: function () {
                var map = FEAT.sortedMap({ c: 3, a: 1, b: 2 });
                this.is.same(map.toString(), '{ a: 1, b: 2, c: 3 }');
                this.is.same(FEAT.sortedMap().toString(), '{}');
            },

            getting_keys_sorted_default: function () {
                var map = FEAT.sortedMap({ c: 1, a: 2, b: 3 });
                this.is.same(map.keys().toString(), 'a,b,c');
            },

            getting_keys_sorted_with_comparator: function () {
                var map = FEAT.sortedMap({ c: 1, a: 2, b: 3 }, function (a, b) { return a > b; });
                this.is.same(map.keys().toString(), 'c,b,a');
            },

            getting_values_default: function () {
                var map = FEAT.sortedMap({ c: 1, a: 2, b: 3 });
                this.is.same(map.values().toString(), '2,3,1');
            },

            getting_values_with_comparator: function () {
                var map = FEAT.sortedMap({ c: 1, a: 2, b: 3 }, function (a, b) { return a > b; });
                this.is.same(map.values().toString(), '1,3,2');
            }
        },

        cow_map: {

            adding_items: function () {
                var i, a = ['y', 'a', 'c', 'z', 'b', 'x'],
                    map1 = FEAT.cowMap(),
                    map2 = map1;
                for (i = 0; i < a.length; i += 1) {
                    map2 = map2.assoc(a[i], i + 1);
                }
                this.is.not.same(map1, map2);
                for (i = 0; i < a.length; i += 1) {
                    this.is.undefined(map1.get(a[i]));
                }
                for (i = 0; i < a.length; i += 1) {
                    this.is.same(map2.get(a[i]), i + 1);
                }
            },

            removing_items: function () {
                var i, a = ['c', 'z', 'y', 'a', 'x', 'b'],
                    map1 = FEAT.cowMap(),
                    map2;
                for (i = 0; i < a.length; i += 1) {
                    map1 = map1.assoc(a[i], i + 1);
                }
                map2 = map1;
                for (i = 0; i < Math.round(a.length / 2); i += 1) {
                    map2 = map2.dissoc(a[i]);
                }
                for (i = 0; i < Math.round(a.length / 2); i += 1) {
                    this.is.undefined(map2.get(a[i]));
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    this.is.same(map2.get(a[i]), i + 1);
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    map2 = map2.dissoc(a[i]);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.is.same(map1.get(a[i]), i + 1);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.is.undefined(map2.get(a[i]));
                }
            },

            copying_to_object: function () {
                var i, a = ['y', 'a', 'c', 'z', 'b', 'x'],
                    map = FEAT.cowMap(a),
                    b = map.toObject(),
                    c = map.toObject({ o: 1 });
                for (i = 0; i < a.length; i += 1) {
                    this.is.same(map.get(a[i]), b[a[i]]);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.is.same(map.get(a[i]), c[a[i]]);
                }
                this.is.same(c.o, 1);
            },

            convert_to_string: function () {
                var map = FEAT.cowMap({ c: 3, a: 1, b: 2 });
                this.is.true(/\{ [abc]: [123], [abc]: [123], [abc]: [123] \}/.test(map.toString()));
                this.is.same(FEAT.cowMap().toString(), '{}');
            },

            adding_items_directly: function () {
                var i, a = ['y', 'a', 'c', 'z', 'b', 'x'],
                    map1 = {},
                    map2 = map1;
                for (i = 0; i < a.length; i += 1) {
                    map2 = FEAT.assoc(map2, a[i], i + 1);
                }
                this.is.not.same(map1, map2);
                for (i = 0; i < a.length; i += 1) {
                    this.is.undefined(map1[a[i]]);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.is.same(map2[a[i]], i + 1);
                }
            },

            removing_items_directly: function () {
                var i, a = ['c', 'z', 'y', 'a', 'x', 'b'],
                    map1 = {},
                    map2;
                for (i = 0; i < a.length; i += 1) {
                    map1 = FEAT.assoc(map1, a[i], i + 1);
                }
                map2 = map1;
                for (i = 0; i < Math.round(a.length / 2); i += 1) {
                    map2 = FEAT.dissoc(map2, a[i]);
                }
                for (i = 0; i < Math.round(a.length / 2); i += 1) {
                    this.is.undefined(map2[a[i]]);
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    this.is.same(map2[a[i]], i + 1);
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    map2 = FEAT.dissoc(map2, a[i]);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.is.same(map1[a[i]], i + 1);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.is.undefined(map2[a[i]]);
                }
            }
        },

        vector: {

            create_empty: function () {
                this.is.same(FEAT.vector().count(), 0);
                this.is.same(FEAT.vector([]).count(), 0);
            },

            create_from_object: function () {
                var vector = FEAT.vector([1, 2, 3]);
                this.is.same(vector.count(), 3);
                this.is.same(vector.get(0), 1);
                this.is.same(vector.get(1), 2);
                this.is.same(vector.get(2), 3);
                this.is.undefined(vector.get(3));
            },

            adding_values: function () {
                var i, vector = FEAT.vector();
                for (i = 0; i < 33; i += 1) {
                    vector = vector.push(i);
                }
                this.is.same(vector.count(), 33);
                this.is.same(vector.get(0), 0);
                this.is.same(vector.get(1), 1);
                this.is.same(vector.get(7), 7);
                this.is.same(vector.get(8), 8);
                this.is.same(vector.get(15), 15);
                this.is.same(vector.get(16), 16);
                this.is.same(vector.get(31), 31);
                this.is.same(vector.get(32), 32);
            },

            setting_values: function () {
                var i, vector = FEAT.vector();
                for (i = 0; i < 33; i += 1) {
                    vector = vector.push(i);
                }
                for (i = 0; i < 33; i += 1) {
                    vector = vector.set(i, i + 10);
                }
                this.is.same(vector.get(0), 10);
                this.is.same(vector.get(1), 11);
                this.is.same(vector.get(7), 17);
                this.is.same(vector.get(8), 18);
                this.is.same(vector.get(15), 25);
                this.is.same(vector.get(16), 26);
                this.is.same(vector.get(31), 41);
                this.is.same(vector.get(32), 42);
            },

            removing_values: function () {
                var i, vector = FEAT.vector();
                for (i = 0; i < 33; i += 1) {
                    vector = vector.push(i);
                }
                this.is.same(vector.count(), 33);
                for (i = 0; i < 32; i += 1) {
                    vector = vector.pop();
                }
                this.is.same(vector.count(), 1);
                vector = vector.pop();
                this.is.same(vector.count(), 0);
                vector = vector.pop();
                this.is.same(vector.count(), 0);
            },

            convert_to_array: function () {
                var i, a1 = [1, 2, 3], a2 = FEAT.vector(a1).toArray();
                this.is.not.same(a1, a2);
                this.is.same(a1.length, a2.length);
                for (i = 0; i < a1.length; i += 1) {
                    this.is.same(a1[i], a2[i]);
                }
            },

            convert_to_string: function () {
                var vec = FEAT.vector([1, 2, 3]);
                this.is.same(vec.toString(), '[1, 2, 3]');
                this.is.same(FEAT.vector().toString(), '[]');
            }
        }
    };
}());
