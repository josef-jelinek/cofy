var TEST = (function (nil) {
  'use strict';
  function fail(message) {
    throw { name: 'TestFail', message: message };
  }

  var assert_calls = 0;

  var asserts = {
    fail: function (message) {
      assert_calls++;
      return fail(message || 'failed');
    },
    throwsError: function (f, message) {
      assert_calls++;
      var succeeded = false;
      try {
        f();
        succeeded = true;
      } catch (e) {}
      return !succeeded || fail(message || 'no error thrown');
    },
    isTrue: function (cond, message) {
      assert_calls++;
      return cond === true || fail(message || 'not true');
    },
    isFalse: function (cond, message) {
      assert_calls++;
      return cond === false || fail(message || 'not false');
    },
    isTruthy: function (cond, message) {
      assert_calls++;
      return cond || fail(message || 'not truthy');
    },
    isFalsy: function (cond, message) {
      assert_calls++;
      return !cond || fail(message || 'not falsy');
    },
    isNull: function (o, message) {
      assert_calls++;
      return o === null || fail(message || 'not null');
    },
    isUndefined: function (o, message) {
      assert_calls++;
      return o === nil || fail(message || 'not undefined');
    },
    isSame: function (o1, o2, message) {
      assert_calls++;
      return o1 === o2 || fail(message || 'not the same');
    },
    isNotSame: function (o1, o2, message) {
      assert_calls++;
      return o1 !== o2 || fail(message || 'the same');
    }
  };

  function run_success(test, result) {
    assert_calls = 0;
    test.call(asserts);
    return {
      calls: result.calls + 1,
      fails: result.fails,
      color: result.color
    };
  }

  function run_error(name, message, result, error) {
    error(name, message, assert_calls);
    return {
      calls: result.calls + 1,
      fails: result.fails + 1,
      color: '#FF6633'
    };
  }

  function run_one(test, name, result, error) {
    try {
      return run_success(test, result);
    } catch (e) {
      return run_error(name, e.message, result, error);
    }
  }

  function run(tests, name, result, error) {
    var prefix = name && name + '.';
    if (typeof tests === 'function')
      return run_one(tests, name, result, error);
    for (var s in tests)
      if (Object.prototype.hasOwnProperty.call(tests, s))
        result = run(tests[s], prefix + s, result, error);
    return result;
  }

  return {
    init: function (resultElem, logElem) {

      function error(name, message, assert_calls) {
        var div = document.createElement('div');
        var label = name + ' assert ' + assert_calls;
        div.appendChild(document.createTextNode(label + ': ' + message));
        logElem.appendChild(div);
      }

      return function (tests) {
        var s, result = { calls: 0, fails: 0, color: '#66FF33' };
        result = run(tests, '', result, error);
        resultElem.style.backgroundColor = result.color;
        resultElem.innerHTML = '';
        s = result.fails === 0 ? result.calls + ' passed'
          : result.fails + ' of ' + result.calls + ' failed';
        resultElem.appendChild(document.createTextNode(s));
      };
    }
  };
}());
