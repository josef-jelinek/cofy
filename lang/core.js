// requires object(prototype) and contains(object, key) functions defined
var COFY = (function (nil) {
  'use strict';

  function read_all(tokens) {
    var i = 0;

    function read_seq() {
      var x = [];
      while (i < tokens.length && tokens[i] !== ')')
        x.push(read(tokens));
      return x;
    }

    function read() {
      var token, x = [];
      if (i >= tokens.length)
        throw { name: 'SyntaxError', message: 'Expected more' };
      token = tokens[i++];
      if ('"' === token)
        throw { name: 'SyntaxError', message: 'Unclosed string' };
      if ("'" === token)
        return ['quote', read()];
      if ('(' === token) {
        x = read_seq();
        if (i >= tokens.length)
          throw { name: 'SyntaxError', message: 'Expected more' };
        i++;
        return x;
      }
      if (')' === token)
        throw { name: 'SyntaxError', message: 'Unexpected ")"' };
      return isNaN(token) ? token : +token;
    }

    x = read_seq();
    if (i < tokens.length)
      throw { name: 'SyntaxError', message: 'Trailing characters' };
    return x;
  }

  function tokenize(s) {
    return s.match(/'|\(|\)|[^\s'()"]+|"([^\\]|\\.)*?"|"/g);
  }

  function compile(x) {
    if (typeof x === 'string')
      return function (env) { return env[x]; };
    if (typeof x === 'number')
      return function (env) { return x; };
    if (x[0] === 'quote')
      return function (x) {
        return function(env) { return x; };
      }(x[1]);
    if (x[0] === 'if')
      return function (x1, x2, x3) {
        return function (env) { return x1(env) ? x2(env) : x3(env); };
      }(compile(x[1]), compile(x[2]), compile(x[3]));
    if (x[0] === 'def')
      return function (x1, x2) {
        return function (env) {
          if (contains(env, x1))
            throw { name: 'RuntimeError', message: 'Redefining ' + x1 };
          env[x1] = x2(env);
        };
      }(x[1], compile(x[2]));
    if (x[0] === 'fn')
      return function (x1, x2) {
        return function (env) {
          return function () {
            return x2(make_env(to_map({}, x1, arguments), env));
          };
        };
      }(x[1], do_seq(x.slice(2).map(compile)));
    if (x[0] === 'do')
      return do_seq(x.slice(1).map(compile));
    x = x.map(compile);
    var f = x.shift();
    return function (env) {
      return f(env).apply(env, x.map(function(f) { return f(env); }));
    };
  }

  function do_seq(x, res) {
    return function(env) {
      for (var i = 0; i < x.length; i++)
        res = x[i](env);
      return res;
    };
  }

  function to_map(bindings, names, values) {
    for (var i = 0; i < names.length; i++)
      bindings[names[i]] = values[i];
    return bindings;
  }

  function make_env(bindings, scope) {
    var env = object(scope);
    for (var key in bindings)
      if (contains(bindings, key))
        env[key] = bindings[key];
    return env;
  }

  var global_env = (function () {

    function is_nil(x) {
      return x === null || x === nil;
    }

    function is_array(x) {
      return x && typeof x === 'object' && x.constructor === Array;
    }

    var bindings = {
      'nil': nil,
      'null': null,
      'true': true,
      'false': false,
      '+': function (a, b) { return a + b; },
      '-': function (a, b) { return a - b; },
      '*': function (a, b) { return a * b; },
      '/': function (a, b) { return a / b; },
      '>': function (a, b) { return a > b; },
      '<': function (a, b) { return a < b; },
      '>=': function (a, b) { return a >= b; },
      '<=': function (a, b) { return a <= b; },
      '=': function (a, b) { return a === b; },
      'remainder': function (a, b) { return a % b; },
      'length': function (x) { return x.length; },
      'cons': function (x, y) { return is_nil(y) ? [x] : [x].concat(y); },
      'first': function (x) { return x.length > 0 ? x[0] : nil; },
      'rest': function (x) { return x.length > 0 ? x.slice(1) : nil; },
      'append': function (x, y) { return x.concat(y); },
      'list': function () { return Array.prototype.slice.call(arguments); },
      'null?': function (x) { return is_nil(x); },
      'empty?': function (x) { return is_nil(x) || x.length === 0; },
      'seq?': function (x) { return is_array(x); },
      'symbol?': function (x) { return typeof x === 'string'; }
    };
    var math_names = [
      'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor',
      'log', 'max', 'min', 'pow', 'random', 'round', 'sin', 'sqrt', 'tan',
      'PI', 'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT2', 'SQRT1_2'
    ];
    for (var i = 0; i < math_names.length; i++)
      bindings[math_names[i]] = Math[math_names[i]];
    return bindings;
  }());

  return {
    read: function(s) { return read_all(tokenize(s)); },
    eval: function(x) { return do_seq(x.map(compile))(global_env); }
  };
}());
