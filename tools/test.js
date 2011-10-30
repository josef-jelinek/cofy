var TEST = (function (mu) {
  'use strict';
  function fail(message) {
    throw { name: 'TestFail', message: message };
  }

  var asserts = {
    fail: function (message) {
      return fail(message || 'failed');
    },
    isTrue: function (cond, message) {
      return cond === true || fail(message || 'not true');
    },
    isFalse: function (cond, message) {
      return cond === false || fail(message || 'not false');
    },
    isTruthy: function (cond, message) {
      return cond || fail(message || 'not truthy');
    },
    isFalsy: function (cond, message) {
      return !cond || fail(message || 'not falsy');
    },
    isNull: function (o, message) {
      return o === null || fail(message || 'not null');
    },
    isUndefined: function (o, message) {
      return o === mu || fail(message || 'not undefined');
    },
    isSame: function (o1, o2, message) {
      return o1 === o2 || fail(message || 'not the same');
    },
    isNotSame: function (o1, o2, message) {
      return o1 !== o2 || fail(message || 'the same');
    }
  };

  function run_success(test, result) {
    test.call(asserts);
    return {
      calls: result.calls + 1,
      fails: result.fails,
      color: result.color
    };
  }

  function run_error(name, message, result, error) {
    error(name, message);
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

      function error(name, message) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(name + ': ' + message));
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
