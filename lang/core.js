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
    this.toString = function () { return '[object Symbol]'; }
    symbols[s] = this;
  }

  function Cons(head, tail) {
    if (!isCons(this))
      return new Cons(head, tail);
    this.head = head;
    this.tail = tail;
    this.toString = function () { return '[object Cons]'; }
  }

  function Syntax(compile) {
    if (!isSyntax(this))
      return new Syntax(compile);
    this.compile = compile;
    this.toString = function () { return '[object Syntax]'; }
  }

  function isSymbol(x) { return x instanceof Symbol; }
  function isCons(x) { return x instanceof Cons; }
  function isSyntax(x) { return x instanceof Syntax; }

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

  var print = (function () {

    function print(s_expr) {
      if (s_expr === null)
        return '()';
      if (typeof s_expr === 'string')
        return escape_string(s_expr);
      if (isSymbol(s_expr))
        return s_expr.name;
      if (isCons(s_expr))
        return print_list(s_expr);
      return '' + s_expr;
    }

    function print_list(list) {
      return '(' + print_to_array(list).join(' ') + ')';
    }

    function print_to_array(list) {
      var strings = [], rest;
      for (rest = list; isCons(rest); rest = rest.tail)
        strings.push(print(rest.head));
      if (rest !== null)
        strings.push(': ' + print(rest));
      return strings;
    }

    function escape_string(s) {
      s = s.replace(/([\\"])/g, '\\$1');
      for (var key in escape_chars)
        if (contains(escape_chars, key))
          s = s.replace(key, escape_chars[key]);
      return '"' + s + '"';
    }

    var escape_chars = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };

    return print;
  }());

  var compile = (function () {
    var global_env = create_global_env();

    function evaluate(expr, env) {
      return typeof expr === 'function' ? expr(env) : expr;
    }

    function error(message) {
      throw { name: 'RuntimeError', message: message || 'Unspecified error' };
    }

    function compile(s_expr) {
      if (s_expr instanceof Symbol)
        return function (env) { return env[s_expr.name]; };
      if (!isCons(s_expr))
        return s_expr;
      var head = s_expr.head;
      if (isSymbol(head) && has_syntax_defined(head.name))
        return compile_syntax(head.name, s_expr.tail);
      return compile_call(s_expr);
    }

    function has_syntax_defined(name) {
      return contains(global_env, name) && isSyntax(global_env[name]);
    }

    function compile_syntax(name, s_expr) {
      return global_env[name].compile(s_expr);
    }

    function compile_call(s_expr) {
      var expr = map(compile, s_expr);
      return function (env) {
        var fn = evaluate(expr.head, env), values = [];
        for (var list = expr.tail; list; list = list.tail)
          values.push(evaluate(list.head, env));
        return fn.apply(env, values);
      };
    }

    function compile_fn(s_expr) {
      var names = get_name_array(s_expr.head), body = compile_do(s_expr.tail);
      return function (env) {
        return function () {
          return evaluate(body, make_env(names, arguments, env));
        };
      };
    }

    function compile_if(s_expr) {
      var cond = compile(s_expr.head),
          t = compile(s_expr.tail.head),
          f = compile(s_expr.tail.tail.head);
      return function (env) {
        return evaluate(evaluate(cond, env) ? t : f, env);
      };
    }

    function compile_def(s_expr) {
      var pairs = get_def_pairs(s_expr);
      return function (env) {
        for (var rest = pairs; rest; rest = rest.tail)
          define_binding(rest.head.head, rest.head.tail, env);
      };
    }

    function compile_do(s_expr) {
      var seq = map(compile, s_expr);
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

    function define_binding(name, expr, env) {
      if (contains(env, name))
        error('Redefining ' + name);
      env[name] = evaluate(expr, env);
    }

    function get_def_pairs(s_expr) {
      if (!s_expr)
        return null;
      var pair = Cons(s_expr.head.name, compile(s_expr.tail.head));
      return Cons(pair, get_def_pairs(s_expr.tail.tail));
    }

    function get_name_array(list) {
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

    function create_global_env() {
      var bindings = {
        'quote': Syntax(function (s_expr) { return s_expr.head; }),
        'fn': Syntax(compile_fn),
        'if': Syntax(compile_if),
        'def': Syntax(compile_def),
        'do': Syntax(compile_do),
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
    }

    return function (s_expr) {
      var expr = compile_do(s_expr);
      return function (clean) {
        return evaluate(expr, clean ? create_global_env() : global_env);
      };
    };
  }());

  return {
    read: parse,
    compile: compile,
    eval: function (s_expr) {
      return compile(s_expr)();
    },
    clean_eval: function (s_expr) {
      return compile(s_expr)(true);
    },
    read_eval: function (s) {
      return compile(parse(s))();
    },
    clean_read_eval: function (s) {
      return compile(parse(s))(true);
    },
    print: print,
    read_eval_print: function (s) {
      return print(compile(parse(s))());
    },
    clean_read_eval_print: function (s) {
      return print(compile(parse(s))(true));
    }
  };
}());
