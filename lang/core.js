var COFY = (function (mu) {
  'use strict';

  var read_all = function (tokens) {
    var x = [];
    while (tokens.length > 0)
      x.push(read(tokens));
    return x;
  };

  var read = function (tokens) {
    if (tokens.length === 0)
      throw { name: 'SyntaxError', message: 'unexpected end of input' };
    var token = tokens.shift();
    if ("'" === token)
      return ['quote', read(tokens)];
    if ('(' === token) {
      var x = [];
      while (tokens[0] !== ')')
        x.push(read(tokens));
      tokens.shift();
      return x;
    }
    if (')' === token)
      throw { name: 'SyntaxError', message: 'unexpected ")"' };
    return isNaN(token) ? token : +token;
  };

  var tokenize = function (s) {
    s = s.replace(/'/g, " ' ").replace(/\(/g, ' ( ').replace(/\)/g, ' ) ');
    return s.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').split(' ');
  };

  var compile = function (x) {
    if (typeof x === 'string')
      return function(env) { return env.find(x.valueOf()); };
    if (typeof x === 'number')
      return function(env) { return x; };
    if (x[0] === 'quote')
      return function(x) { return function(env) { return x; }; }(x[1]);
    if (x[0] === 'if')
      return function(x1, x2, x3) {
        return function(env) { return x1(env) ? x2(env) : x3(env); };
      }(compile(x[1]), compile(x[2]), compile(x[3]));
    if (x[0] === 'set!')
      return function(x1, x2) {
        return function(env) { env.set(x1, x2(env)); };
      }(x[1], compile(x[2]));
    if (x[0] === 'def')
      return function(x1, x2) {
        return function(env) { env.def(x1, x2(env)); };
      }(x[1], compile(x[2]));
    if (x[0] === 'fn')
      return function(x1, x2) {
        return function(env) {
          return function() {
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
  };

  var do_seq = function (x, res) {
    return function(env) {
      for (var i = 0; i < x.length; i++)
        res = x[i](env);
      return res;
    };
  };

  var to_map = function (bindings, names, values) {
    for (var i = 0; i < names.length; i++)
      bindings[names[i]] = values[i];
    return bindings;
  };

  var make_env = function (bindings, scope) {
    var has = function(s) { return bindings.hasOwnProperty(s); };
    return {
      find: function(s) { return has(s) ? bindings[s] : scope.find(s); },
      def: function(s, x) { bindings[s] = x; },
      set: function(s, x) {
        return has(s) ? bindings[s] = x : scope.set(s, x);
      }
    }
  };

  var global_env = function () {
    var is_nil = function(x) { return x === null || x === mu; };
    var is_array = function(x) {
      return x && typeof x === 'object' && x.constructor === Array;
    };
    var bindings = {
      '+': function(a, b) { return a + b; },
      '-': function(a, b) { return a - b; },
      '*': function(a, b) { return a * b; },
      '/': function(a, b) { return a / b; },
      '>': function(a, b) { return a > b; },
      '<': function(a, b) { return a < b; },
      '>=': function(a, b) { return a >= b; },
      '<=': function(a, b) { return a <= b; },
      '=': function(a, b) { return a === b; },
      'remainder': function(a, b) { return a % b; },
      'length': function(x) { return x.length; },
      'cons': function(x, y) { return is_nil(y) ? [x] : [x].concat(y); },
      'first': function(x) { return x.length > 0 ? x[0] : mu; },
      'rest': function(x) { return x.length > 0 ? x.slice(1) : mu; },
      'append': function(x, y) { return x.concat(y); },
      'list': function() { return Array.prototype.slice.call(arguments); },
      'null?': function(x) { return is_nil(x); },
      'empty?': function(x) { return is_nil(x) || x.length === 0; },
      'seq?': function(x) { return is_array(x); },
      'symbol?': function(x) { return typeof x === 'string'; }
    };
    var math_names = [
      'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor',
      'log', 'max', 'min', 'pow', 'random', 'round', 'sin', 'sqrt', 'tan'
    ];
    for (var i = 0; i < math_names.length; i++)
      bindings[math_names[i]] = Math[math_names[i]];
    return make_env(bindings);
  }();

  return {
    read: function(s) { return read_all(tokenize(s)); },
    eval: function(x) { return do_seq(x.map(compile))(global_env); }
  };
}());
