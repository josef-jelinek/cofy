/*global document, setTimeout */

var TEST = (function (nil) {
    'use strict';
    var check_cond, assert_calls = 0, asserts,
        comparison_info, get_type, get_string_diff, html_encode,
        run, run_one;

    check_cond = function (cond, message) {
        assert_calls += 1;
        if (!cond) {
            throw { name: 'test-fail', message: message };
        }
    };

    asserts = {

        fail: function (message) {
            check_cond(false, message || 'failed');
        },

        throwsError: function (f, message) {
            var succeeded = false;
            try {
                f();
                succeeded = true;
            } catch (e) {}
            check_cond(!succeeded, message || 'no error thrown');
        },

        isTrue: function (cond, message) {
            check_cond(cond === true, message || 'not true');
        },

        isFalse: function (cond, message) {
            check_cond(cond === false, message || 'not false');
        },

        isTruthy: function (cond, message) {
            check_cond(cond, message || 'not truthy');
        },

        isFalsy: function (cond, message) {
            check_cond(!cond, message || 'not falsy');
        },

        isNull: function (o, message) {
            check_cond(o === null, message || 'not null');
        },

        isUndefined: function (o, message) {
            check_cond(o === nil, message || 'not undefined');
        },

        isSame: function (o1, o2, message) {
            check_cond(o1 === o2, message || comparison_info(o1, o2));
        },

        isNotSame: function (o1, o2, message) {
            check_cond(o1 !== o2, message || 'the same');
        }
    };

    comparison_info = function (o1, o2) {
        var t1, t2, diff;

        t1 = get_type(o1);
        t2 = get_type(o2);
        if (t1 !== t2) {
            return 'types <i>' + t1 + '</i> and <i>' + t2 + '</i> are not the same';
        }
        if (t1 === 'number') {
            return '<i>numbers</i> <b>' + o1 + '</b> and <b>' + o2 + '</b> are not the same';
        }
        if (t1 === 'string') {
            diff = get_string_diff(o1, o2);
            return '<i>strings</i> "' + diff[0] + '" and "' + diff[1] + '" differ';
        }
        return '<i>' + t1 + '</i> references are not the same';
    };

    get_type = function (o) {
        if (o === null) {
            return 'null';
        }
        if (o === nil) {
            return 'undefined';
        }
        if (o instanceof Array) {
            return 'array';
        }
        return typeof o;
    };

    get_string_diff = function (s1, s2) {
        var i0, ii, s, ss1 = '', ss2 = '', context = 8;
        if (s1 === s2) {
            return ['', ''];
        }
        for (i0 = 0; i0 < s1.length && i0 < s2.length; i0 += 1) {
            if (s1.charCodeAt(i0) !== s2.charCodeAt(i0)) {
                break;
            }
        }
        for (ii = 0; ii < s1.length && ii < s2.length; ii += 1) {
            if (s1.charCodeAt(s1.length - ii - 1) !== s2.charCodeAt(s2.length - ii - 1)) {
                break;
            }
        }
        if (i0 > 0) {
            s = (i0 > context ? '...' : '') + html_encode(s1.slice(Math.max(0, i0 - context), i0));
            ss1 += s;
            ss2 += s;
        }
        if (i0 >= s1.length - ii) {
            if (s2.length - ii - i0 < 3 * context) {
                ss2 += '<s><b>' + html_encode(s2.slice(i0, s2.length - ii)) + '</b></s>';
            } else {
                ss2 += '<s><b>' + html_encode(s2.slice(i0, i0 + context));
                ss2 += '...' + html_encode(s2.slice(s2.length - ii - context, s2.length - ii)) + '</b></s>';
            }
        } else if (i0 >= s2.length - ii) {
            if (s1.length - ii - i0 < 3 * context) {
                ss1 += '<s><b>' + html_encode(s1.slice(i0, s1.length - ii)) + '</b></s>';
            } else {
                ss1 += '<s><b>' + html_encode(s1.slice(i0, i0 + context));
                ss1 += '...' + html_encode(s1.slice(s1.length - ii - context, s1.length - ii)) + '</b></s>';
            }
        } else {
            if (s1.length - ii - i0 < 3 * context) {
                ss1 += '<b>' + html_encode(s1.slice(i0, s1.length - ii)) + '</b>';
            } else {
                ss1 += '<b>' + html_encode(s1.slice(i0, i0 + context));
                ss1 += '...' + html_encode(s1.slice(s1.length - ii - context, s1.length - ii)) + '</b>';
            }
            if (s2.length - ii - i0 < 3 * context) {
                ss2 += '<b>' + html_encode(s2.slice(i0, s2.length - ii)) + '</b>';
            } else {
                ss2 += '<b>' + html_encode(s2.slice(i0, i0 + context));
                ss2 += '...' + html_encode(s2.slice(s2.length - ii - context, s2.length - ii)) + '</b>';
            }
        }
        if (ii > 0) {
            s = html_encode(s1.slice(s1.length - ii, Math.min(s1.length - ii + context, s1.length))) + (ii > context ? '...' : '');
            ss1 += s;
            ss2 += s;
        }
        return [ss1, ss2];
    };

    html_encode = function (s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\s/g, '&nbsp;');
    };

    run = function (tests, name, results, on_step, on_error, callback) {
        var keys, do_next, prefix = name && name + '.';
        if (typeof tests === 'function') {
            run_one(tests, name, results, on_step, on_error, callback);
            return;
        }
        keys = Object.keys(tests);
        do_next = function (results) {
            if (keys.length === 0) {
                callback(results);
                return;
            }
            var key = keys.shift();
            run(tests[key], prefix + key, results, on_step, on_error, do_next);
        };
        do_next(results);
    };

    run_one = function (test, name, results, on_step, on_error, callback) {
        try {
            assert_calls = 0;
            on_step(name, results);
            test.call(asserts);
            results = {
                calls: results.calls + 1,
                fails: results.fails,
                asserts: results.asserts + assert_calls
            };
        } catch (e) {
            results = {
                calls: results.calls + 1,
                fails: results.fails + 1,
                asserts: results.asserts + assert_calls
            };
            on_error(name, e.message, assert_calls, e.name === 'test-fail');
        }
        setTimeout(function () { callback(results); }, 0);
    };

    return {

        init: function (resultElem, logElem) {
            var set_html, on_step, on_error, on_done;

            set_html = function (text, color) {
                resultElem.style.backgroundColor = color;
                if (text) {
                    resultElem.innerHTML = '';
                    resultElem.appendChild(document.createTextNode(text));
                }
            };

            on_step = function (name, results) {
                var s = 'Running "' + name + '", ';
                if (results.fails > 0) {
                    s += results.fails + ' of ' + results.calls + ' failed';
                } else {
                    s += results.calls + ' passed';
                }
                set_html(s, results.fails > 0 ? '#FFFF33' : '#66CCFF');
            };

            on_error = function (name, message, assert_calls, is_test_fail) {
                var div = document.createElement('div'),
                    label = name + ' assert ' + assert_calls;
                set_html('', '#AA9944');
                if (is_test_fail) {
                    div.innerHTML = label + ': ' + message;
                } else {
                    div.appendChild(document.createTextNode(label + ': ' + message));
                }
                logElem.appendChild(div);
            };

            on_done = function (results) {
                var s;
                if (results.fails > 0) {
                    s = results.fails + ' of ' + results.calls + ' failed (' + results.asserts + ' asserts called)';
                } else {
                    s = results.calls + ' passed (' + results.asserts + ' asserts called)';
                }
                set_html(s, results.fails > 0 ? '#FF9933' : '#99FF33');
            };

            return function (tests) {
                run(tests, '', { calls: 0, fails: 0, asserts: 0 }, on_step, on_error, on_done);
            };
        },

        stringDiff: get_string_diff
    };
}());
