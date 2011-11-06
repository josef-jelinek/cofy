// requires object(prototype) and contains(object, key) functions defined
var COFY = (function (nil) {
  'use strict';
  var symbols = {};

  function Symbol(s) {
    if (contains(symbols, s))
      return symbols[s];
    if (!isSymbol(this))
      return new Symbol(s);
    this.name = s;
    symbols[s] = this;
  }

  function Cons(head, tail) {
    if (!isCons(this))
      return new Cons(head, tail);
    this.head = head;
    this.tail = tail;
  }

  function isSymbol(x) { return x instanceof Symbol; }
  function isCons(x) { return x instanceof Cons; }

  var parse = (function () {
    var token_actions, escape_chars, tokens, index;

    function read_expr() {
      var token = read_token();
      if (contains(token_actions, token))
        return token_actions[token]();
      if (token[0] === '"')
        return get_string(token);
      return isNaN(token) ? Symbol(token) : +token;
    }

    function read_seq() {
      if (index >= tokens.length || tokens[index] === ')')
        return null;
      var expr = read_expr(tokens);
      return Cons(expr, read_seq());
    }

    function read_token() {
      if (index >= tokens.length)
        error('Expected more');
      return tokens[index++];
    }

    function get_string(s) {
      s = s.replace(/^"|"$/g, '').replace(/\\([\\"'])/g, '$1');
      for (var key in escape_chars)
        if (contains(escape_chars, key))
          s = s.replace(key, escape_chars[key]);
      return s;
    }

    function error(message) {
      throw { name: 'SyntaxError', message: message };
    }

    function tokenize(s) {
      return s.match(/'|\(|\)|[^\s'()"]+|"([^\\]|\\.)*?"|"/g);
    }

    escape_chars = { '\\n': '\n', '\\r': '\r', '\\t': '\t' };
    token_actions = {
      '"': function () { error('Unclosed string'); },
      ')': function () { error('Unexpected ")"'); },
      "'": function () {
        return Cons(Symbol('quote'), Cons(read_expr(), null));
      },
      '(': function () {
        var expr = read_seq();
        if (read_token() !== ')')
          error('Expected ")"');
        return expr;
      }
    };
    return function (s) {
      tokens = tokenize(s);
      index = 0;
      var expr = read_seq();
      if (index < tokens.length)
        error('Trailing characters');
      return expr;
    };
  }());

  var compile = (function () {
    var compile_actions, global_env;

    function evaluate(expr, env) {
      return typeof expr === 'function' ? expr(env) : expr;
    }

    function compile(expr) {
      if (expr instanceof Symbol)
        return function (env) { return env[expr.name]; };
      if (!isCons(expr))
        return expr;
      if (isSymbol(expr.head) && contains(compile_actions, expr.head.name))
        return compile_actions[expr.head.name](expr.tail);
      return compile_call(map(compile, expr));
    }

    function compile_call(expr) {
      return function (env) {
        var values = [];
        for (var list = expr.tail; list; list = list.tail)
          values.push(evaluate(list.head, env));
        return evaluate(expr.head, env).apply(env, values);
      };
    }

    function compile_fn(expr) {
      var params = symbols_to_array(expr.head), body = compile_do(expr.tail);
      return function (env) {
        return function () {
          return evaluate(body, make_env(params, arguments, env));
        };
      };
    }

    function compile_if(expr) {
      var cond = compile(expr.head),
          t = compile(expr.tail.head),
          f = compile(expr.tail.tail.head);
      return function (env) {
        return evaluate(evaluate(cond, env) ? t : f, env);
      };
    }

    function compile_def(expr) {
      var name = expr.head, expr = compile(expr.tail.head);
      return function (env) {
        if (contains(env, name))
          throw { name: 'RuntimeError', message: 'Redefining ' + name };
        env[name] = evaluate(expr, env);
      };
    }

    function compile_do(expr) {
      var seq = map(compile, expr);
      return function (env) {
        var res;
        for (var body = seq; body; body = body.tail)
          res = evaluate(body.head, env);
        return res;
      };
    }

    function make_env(names, values, parent_env) {
      var env = object(parent_env), n = Math.min(values.length, names.length);
      for (var i = 0; i < n; i++)
        env[names[i]] = values[i];
      for (var j = values.length; j < names.length; j++)
        env[names[i]] = nil;
      return env;
    }

    function symbols_to_array(list) {
      var names = [];
      for (var rest = list; rest; rest = rest.tail)
        names.push(rest.head.name);
      return names;
    }

    function map(f, list) {
      return !list ? list : Cons(f(list.head), map(f, list.tail));
    }

    function equal(a, b) {
      return a === b || isCons(a) && isCons(b) &&
        equal(a.head, b.head) && equal(a.tail, b.tail);
    }

    function sum() {
      var sum = 0;
      for (var i = 0; i < arguments.length; i++)
        sum += arguments[i];
      return sum;
    }

    function product() {
      var product = 1;
      for (var i = 0; i < arguments.length && product !== 0; i++)
        product *= arguments[i];
      return product;
    }

    function goes_up() {
      for (var i = 1; i < arguments.length; i++)
        if (arguments[i - 1] >= arguments[i])
          return false;
      return arguments.length > 1;
    }

    function goes_down() {
      for (var i = 1; i < arguments.length; i++)
        if (arguments[i - 1] <= arguments[i])
          return false;
      return arguments.length > 1;
    }

    function does_not_go_up() {
      for (var i = 1; i < arguments.length; i++)
        if (arguments[i - 1] < arguments[i])
          return false;
      return true;
    }

    function does_not_go_down() {
      for (var i = 1; i < arguments.length; i++)
        if (arguments[i - 1] > arguments[i])
          return false;
      return true;
    }

    compile_actions = {
      'quote': function (expr) { return expr.head; },
      'fn': compile_fn,
      'if': compile_if,
      'def': compile_def,
      'do': compile_do
    };
    global_env = (function () {
      var bindings = {
        'nil': nil,
        'true': true,
        'false': false,
        '+': function () { return sum.apply(null, arguments); },
        '-': function (a, b) { return arguments.length === 1 ? -a : a - b; },
        '*': function (a, b) { return product.apply(null, arguments); },
        '/': function (a, b) { return a / b; },
        '<': function () { return goes_up.apply(null, arguments); },
        '>': function () { return goes_down.apply(null, arguments); },
        '<=': function () { return does_not_go_down.apply(null, arguments); },
        '>=': function () { return does_not_go_up.apply(null, arguments); },
        '=': function (a, b) { return a === b || equal(a, b); },
        'identical?': function (a, b) { return a === b; },
        'remainder': function (a, b) { return a % b; },
        'not': function (x) { return !x; },
        'cons': function (a, b) { return Cons(a, b); },
        'first': function (x) { return x.head; },
        'rest': function (x) { return x.tail; },
        'pair?': function (x) { return isCons(x); },
        'symbol': function (s) { return Symbol(s); },
        'symbol?': function (x) { return isSymbol(x); },
        'nil?': function (x) { return x === nil; }
      };
      var math_names = [
        'abs', 'min', 'max', 'random', 'round', 'floor', 'ceil',
        'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
        'sqrt', 'pow', 'exp', 'log', 'PI', 'E'
      ];
      for (var i = 0; i < math_names.length; i++)
        bindings[math_names[i]] = Math[math_names[i]];
      return bindings;
    }());
    return function (expr) {
      var compiled = compile_do(expr);
      return function () {
        return evaluate(compiled, global_env);
      };
    };
  }());
  return {
    read: parse,
    compile: compile,
    eval: function (expr) { return compile(expr)(); },
    read_eval: function (s) { return compile(parse(s))(); }
  };
}());
