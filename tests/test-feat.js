/*global FEAT */
var TESTS = (function (nil) {
    'use strict';
    return {
        sorted_map: {

            create_empty: function () {
                this.isSame(FEAT.sortedMap().count(), 0);
                this.isSame(FEAT.sortedMap({}).count(), 0);
            },

            create_from_object: function () {
                var map = FEAT.sortedMap({a: 1, b: 2});
                this.isSame(map.get('a'), 1);
                this.isSame(map.get('b'), 2);
                this.isUndefined(map.get('c'));
                this.isSame(map.get('c', 3), 3);
                this.isTrue(map.contains('a'));
                this.isTrue(map.contains('b'));
                this.isFalse(map.contains('c'));
            },

            adding_items: function () {
                var i, a = ['y', 'a', 'c', 'z', 'b', 'x'],
                    map1 = FEAT.sortedMap(),
                    map2 = map1;
                for (i = 0; i < a.length; i += 1) {
                    map2 = map2.assoc(a[i], i + 1);
                }
                this.isSame(map1.count(), 0);
                this.isSame(map2.count(), a.length);
                for (i = 0; i < a.length; i += 1) {
                    this.isSame(map2.get(a[i]), i + 1);
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
                this.isSame(map2.count(), Math.round(a.length / 2));
                for (i = 0; i < Math.round(a.length / 2); i += 1) {
                    this.isUndefined(map2.get(a[i]));
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    this.isSame(map2.get(a[i]), i + 1);
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    map2 = map2.dissoc(a[i]);
                }
                this.isSame(map1.count(), a.length);
                this.isSame(map2.count(), 0);
                for (i = 0; i < a.length; i += 1) {
                    this.isUndefined(map2.get(a[i]));
                }
            },

            convert_to_object: function () {
                var key, o1 = { a: 1, b: 2, c: 3 }, o2 = FEAT.sortedMap(o1).toObject();
                this.isNotSame(o1, o2);
                for (key in o1) {
                    if (Object.prototype.hasOwnProperty.call(o1, key)) {
                        this.isSame(o1[key], o2[key]);
                    }
                }
                for (key in o2) {
                    if (Object.prototype.hasOwnProperty.call(o2, key)) {
                        this.isSame(o2[key], o1[key]);
                    }
                }
            },

            convert_to_string: function () {
                var map = FEAT.sortedMap({ c: 3, a: 1, b: 2 });
                this.isSame(map.toString(), '{ a: 1, b: 2, c: 3 }');
                this.isSame(FEAT.sortedMap().toString(), '{}');
            },

            getting_keys_sorted_default: function () {
                var map = FEAT.sortedMap({ c: 1, a: 2, b: 3 });
                this.isSame(map.keys().toString(), 'a,b,c');
            },

            getting_keys_sorted_with_comparator: function () {
                var map = FEAT.sortedMap({ c: 1, a: 2, b: 3 }, function (a, b) { return a > b; });
                this.isSame(map.keys().toString(), 'c,b,a');
            },

            getting_values_default: function () {
                var map = FEAT.sortedMap({ c: 1, a: 2, b: 3 });
                this.isSame(map.values().toString(), '2,3,1');
            },

            getting_values_with_comparator: function () {
                var map = FEAT.sortedMap({ c: 1, a: 2, b: 3 }, function (a, b) { return a > b; });
                this.isSame(map.values().toString(), '1,3,2');
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
                this.isNotSame(map1, map2);
                for (i = 0; i < a.length; i += 1) {
                    this.isUndefined(map1.get(a[i]));
                }
                for (i = 0; i < a.length; i += 1) {
                    this.isSame(map2.get(a[i]), i + 1);
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
                    this.isUndefined(map2.get(a[i]));
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    this.isSame(map2.get(a[i]), i + 1);
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    map2 = map2.dissoc(a[i]);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.isSame(map1.get(a[i]), i + 1);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.isUndefined(map2.get(a[i]));
                }
            },

            copying_to_object: function () {
                var i, a = ['y', 'a', 'c', 'z', 'b', 'x'],
                    map = FEAT.cowMap(a),
                    b = map.toObject(),
                    c = map.toObject({ o: 1 });
                for (i = 0; i < a.length; i += 1) {
                    this.isSame(map.get(a[i]), b[a[i]]);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.isSame(map.get(a[i]), c[a[i]]);
                }
                this.isSame(c.o, 1);
            },

            convert_to_string: function () {
                var map = FEAT.cowMap({ c: 3, a: 1, b: 2 });
                this.isTrue(/\{ [abc]: [123], [abc]: [123], [abc]: [123] \}/.test(map.toString()));
                this.isSame(FEAT.cowMap().toString(), '{}');
            },

            adding_items_directly: function () {
                var i, a = ['y', 'a', 'c', 'z', 'b', 'x'],
                    map1 = {},
                    map2 = map1;
                for (i = 0; i < a.length; i += 1) {
                    map2 = FEAT.assoc(map2, a[i], i + 1);
                }
                this.isNotSame(map1, map2);
                for (i = 0; i < a.length; i += 1) {
                    this.isUndefined(map1[a[i]]);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.isSame(map2[a[i]], i + 1);
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
                    this.isUndefined(map2[a[i]]);
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    this.isSame(map2[a[i]], i + 1);
                }
                for (i = Math.round(a.length / 2); i < a.length; i += 1) {
                    map2 = FEAT.dissoc(map2, a[i]);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.isSame(map1[a[i]], i + 1);
                }
                for (i = 0; i < a.length; i += 1) {
                    this.isUndefined(map2[a[i]]);
                }
            }
        },

        vector: {

            create_empty: function () {
                this.isSame(FEAT.vector().count(), 0);
                this.isSame(FEAT.vector([]).count(), 0);
            },

            create_from_object: function () {
                var vector = FEAT.vector([1, 2, 3]);
                this.isSame(vector.count(), 3);
                this.isSame(vector.get(0), 1);
                this.isSame(vector.get(1), 2);
                this.isSame(vector.get(2), 3);
                this.isUndefined(vector.get(3));
            },

            adding_values: function () {
                var i, vector = FEAT.vector();
                for (i = 0; i < 33; i += 1) {
                    vector = vector.push(i);
                }
                this.isSame(vector.count(), 33);
                this.isSame(vector.get(0), 0);
                this.isSame(vector.get(1), 1);
                this.isSame(vector.get(7), 7);
                this.isSame(vector.get(8), 8);
                this.isSame(vector.get(15), 15);
                this.isSame(vector.get(16), 16);
                this.isSame(vector.get(31), 31);
                this.isSame(vector.get(32), 32);
            },

            setting_values: function () {
                var i, vector = FEAT.vector();
                for (i = 0; i < 33; i += 1) {
                    vector = vector.push(i);
                }
                for (i = 0; i < 33; i += 1) {
                    vector = vector.set(i, i + 10);
                }
                this.isSame(vector.get(0), 10);
                this.isSame(vector.get(1), 11);
                this.isSame(vector.get(7), 17);
                this.isSame(vector.get(8), 18);
                this.isSame(vector.get(15), 25);
                this.isSame(vector.get(16), 26);
                this.isSame(vector.get(31), 41);
                this.isSame(vector.get(32), 42);
            },

            removing_values: function () {
                var i, vector = FEAT.vector();
                for (i = 0; i < 33; i += 1) {
                    vector = vector.push(i);
                }
                this.isSame(vector.count(), 33);
                for (i = 0; i < 32; i += 1) {
                    vector = vector.pop();
                }
                this.isSame(vector.count(), 1);
                vector = vector.pop();
                this.isSame(vector.count(), 0);
                vector = vector.pop();
                this.isSame(vector.count(), 0);
            },

            convert_to_array: function () {
                var i, a1 = [1, 2, 3], a2 = FEAT.vector(a1).toArray();
                this.isNotSame(a1, a2);
                this.isSame(a1.length, a2.length);
                for (i = 0; i < a1.length; i += 1) {
                    this.isSame(a1[i], a2[i]);
                }
            },

            convert_to_string: function () {
                var vec = FEAT.vector([1, 2, 3]);
                this.isSame(vec.toString(), '[1, 2, 3]');
                this.isSame(FEAT.vector().toString(), '[]');
            }
        }
    };
}());
