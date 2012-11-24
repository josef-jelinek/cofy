/*globals document */
var TEST = (function (nil) {
    'use strict';
    var check_cond, assert_calls = 0, asserts,
        comparison_info, string_comparison_info, get_string_diff, html_encode, get_type,
        run, run_one, run_success_result, run_error_result;

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
        var t1 = get_type(o1), t2 = get_type(o2);
        if (t1 !== t2) {
            return 'types <i>' + t1 + '</i> and <i>' + t2 + '</i> are not the same';
        }
        if (t1 === 'number') {
            return '<i>numbers</i> <b>' + o1 + '</b> and <b>' + o2 + '</b> are not the same';
        }
        if (t1 === 'string') {
            return string_comparison_info(o1, o2);
        }
        return '<i>' + t1 + '</i> references are not the same';
    };

    string_comparison_info = function (s1, s2) {
        var diff = get_string_diff(s1, s2);
        return '<i>strings</i> "' + diff[0] + '" and "' + diff[1] + '" differ';
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

    run = function (tests, name, results_accumulated, on_error) {
        var key, prefix = name && name + '.';
        if (typeof tests === 'function') {
            return run_one(tests, name, results_accumulated, on_error);
        }
        for (key in tests) {
            if (Object.prototype.hasOwnProperty.call(tests, key)) {
                results_accumulated = run(tests[key], prefix + key, results_accumulated, on_error);
            }
        }
        return results_accumulated;
    };

    run_one = function (test, name, results_accumulated, on_error) {
        try {
            return run_success_result(test, results_accumulated);
        } catch (e) {
            return run_error_result(name, e.message, results_accumulated, on_error, e.name === 'test-fail');
        }
    };

    run_success_result = function (test, results_accumulated) {
        assert_calls = 0;
        test.call(asserts);
        return {
            calls: results_accumulated.calls + 1,
            fails: results_accumulated.fails,
            color: results_accumulated.color
        };
    };

    run_error_result = function (name, message, results_accumulated, on_error, is_test_fail) {
        on_error(name, message, assert_calls, is_test_fail);
        return {
            calls: results_accumulated.calls + 1,
            fails: results_accumulated.fails + 1,
            color: '#FF6633'
        };
    };

    return {

        init: function (resultElem, logElem) {
            var on_error;

            on_error = function (name, message, assert_calls, is_test_fail) {
                var div = document.createElement('div'),
                    label = name + ' assert ' + assert_calls;
                if (is_test_fail) {
                    div.innerHTML = label + ': ' + message;
                } else {
                    div.appendChild(document.createTextNode(label + ': ' + message));
                }
                logElem.appendChild(div);
            };

            return function (tests) {
                var s, results_accumulated = { calls: 0, fails: 0, color: '#66FF33' };
                results_accumulated = run(tests, '', results_accumulated, on_error);
                resultElem.style.backgroundColor = results_accumulated.color;
                resultElem.innerHTML = '';
                if (results_accumulated.fails > 0) {
                    s = results_accumulated.fails + ' of ' + results_accumulated.calls + ' failed';
                } else {
                    s = results_accumulated.calls + ' passed';
                }
                resultElem.appendChild(document.createTextNode(s));
            };
        },

        stringDiff: get_string_diff
    };
}());
