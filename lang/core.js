// requires object(prototype) and contains(object, key) functions defined
var COFY = (function (nil) {
  'use strict';
  var compile_actions;

  function Symbol(s) {
    if (!isSymbol(this))
      return new Symbol(s);
    this.name = s;
  }

  function Cons(head, tail) {
    if (!isCons(this))
      return new Cons(head, tail);
    this.head = head;
    this.tail = tail;
  }

  function isSymbol(x) { return x instanceof Symbol; }
  function isCons(x) { return x instanceof Cons; }
  function isNil(x) { return x === null || x === nil; }

  function read_all(tokens) {
    var token_actions, escape_chars, i, x;

    function read_expr() {
      var token = read_token();
      if (contains(token_actions, token))
        return token_actions[token]();
      if (token[0] === '"')
        return get_string(token);
      return isNaN(token) ? Symbol(token) : +token;
    }

    function read_seq() {
      if (i >= tokens.length || tokens[i] === ')')
        return nil;
      var x = read_expr(tokens);
      return Cons(x, read_seq());
    }

    function read_token() {
      if (i >= tokens.length)
        error('Expected more');
      return tokens[i++];
    }

    function get_string(s) {
      s = s.replace(/^"|"$/g, '').replace(/\\([\\"'])/g, '$1');
      for (var key in escape_cars)
        if (contains(escape_cars, key))
          s = s.replace(key, escape_chars[key]);
      return s;
    }

    function error(message) {
      throw { name: 'SyntaxError', message: message };
    }

    escape_chars = { '\\n': '\n', '\\r': '\r', '\\t': '\t' };
    token_actions = {
      '"': function () { error('Unclosed string'); },
      ')': function () { error('Unexpected ")"'); },
      "'": function () { return Cons(Symbol('quote'), read_expr()); },
      '(': function () {
        var x = read_seq();
        if (read_token() !== ')')
          error('Expected ")"');
        return x;
      }
    };
    i = 0;
    x = read_seq();
    if (i < tokens.length)
      error('Trailing characters');
    return x;
  }

  function tokenize(s) {
    return s.match(/'|\(|\)|[^\s'()"]+|"([^\\]|\\.)*?"|"/g);
  }

  function eval(expr, env) {
    return typeof expr === 'function' ? expr(env) : expr;
  }

  function compile(x) {
    if (x instanceof Symbol)
      return function (env) { return env[x.name]; };
    if (!isCons(x))
      return x;
    // TODO do not tread them as special keywords
    if (isSymbol(x.head) && contains(compile_actions, x.head.name))
      return compile_actions[x.head.name](x.tail);
    return compile_call(compile(x.head), map(compile, x.tail));
  }

  function compile_call(fn, args) {
    return function (env) {
      var values = map_list_to_array(function (x) { return eval(x, env); }, args);
      return eval(fn, env).apply(env, values);
    };
  }

  function compile_fn(x) {
    var params = x.head, body = compile_do(x.tail);
    return function (env) {
      return function () {
        return eval(body, make_env(params, arguments, env));
      };
    };
  }

  function compile_if(x) {
    var cond = compile(x.head),
        t = compile(x.tail.head),
        f = compile(x.tail.tail.head);
    return function (env) {
      return eval(cond, env) ? eval(t, env) : eval(f, env);
    };
  }

  function compile_def(x) {
    var name = x.head, expr = compile(x.tail.head);
    return function (env) {
      if (contains(env, name))
        throw { name: 'RuntimeError', message: 'Redefining ' + name };
      env[name] = eval(expr, env);
    };
  }

  function compile_do(x) {
    var seq = map(compile, x);
    return function (env) {
      var res;
      for (var x = seq; x; x = x.tail)
        res = eval(x.head, env);
      return res;
    };
  }

  function make_env(names, values, parent_env) {
    var env = object(parent_env);
    for (var i = 0; i < names.length; i++)
      env[names[i]] = values[i];
    return env;
  }

  function map(f, list) {
    return !list ? list : Cons(f(list.head), map(f, list.tail));
  }

  function map_list_to_array(f, list) {
    var x = [];
    for (; list; list = list.tail)
      x.push(f(list.head));
    return x;
  }

  compile_actions = {
    'quote': function (x) { return x.head; },
    'fn': compile_fn,
    'if': compile_if,
    'def': compile_def,
    'do': compile_do
  };
  global_env = (function () {
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
      'eq?': function (a, b) { return a === b; },
      'remainder': function (a, b) { return a % b; },
      'not': function (x) { return !x; },
      'cons': function (x, y) { return Cons(x, y); },
      'first': function (x) { return x.head; },
      'rest': function (x) { return x.tail; },
      'null?': function (x) { return isNil(x); },
      'pair?': function (x) { return isCons(x); },
      'symbol?': function (x) { return isSymbol(x); }
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

  return {
    read: function(s) { return read_all(tokenize(s)); },
    eval: function(x) { return eval(compile_do(x), global_env); }
  };
}());
