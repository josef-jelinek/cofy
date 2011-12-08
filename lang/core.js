var COFY = (function (nil) {
  'use strict';

  function object_has_own_property(o, key) {
    return Object.prototype.hasOwnProperty.call(o, key);
  }

  function syntax_error(message) {
    throw { name: 'SyntaxError', message: message || 'An error' };
  }

  function runtime_error(message) {
    throw { name: 'RuntimeError', message: message || 'An error' };
  }

  var create_object_from_prototype = Object.create || function (o) {
    function F() {}
    F.prototype = o || Object.prototype;
    return new F();
  };
  var seal_object = Object.seal || function (o) {};
  var freeze_object = Object.freeze || function (o) {};
  var define_frozen_property = Object.defineProperty && Object.freeze && function (obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      writable: false,
      enumerable: true,
      configurable: false
    });
  } || function (obj, key, value) {
    if (object_has_own_property(obj, key))
      runtime_error('Redefining "' + key + '"');
    obj[key] = value;
  };
  var is_function = typeof alert === 'function' && function (x) {
    return typeof x === 'function';
  } || function (x) {
    return typeof x === 'function' || x !== null && typeof x === 'object' && 'call' in x;
  };

  var symbols = {}, multipart = RegExp('^[^/]+(/[^/]+)+$');

  function Symbol(name) {
    if (object_has_own_property(symbols, name))
      return symbols[name];
    if (!is_symbol(this))
      return new Symbol(name);
    this.name = name;
    if (multipart.test(name))
      this.parts = get_symbol_parts(name);
    freeze_object(this);
    symbols[name] = this;
  }

  function get_symbol_parts(name) {
    var i, names = name.split('/'), parts = Array(names.length);
    for (i = 0; i < names.length; i++)
      parts[i] = isNaN(names[i]) ? names[i] : +names[i];
    freeze_object(parts);
    return parts;
  }

  function Cons(head, tail) {
    if (!is_cons(this))
      return new Cons(head, tail);
    this.head = head;
    this.tail = tail;
    freeze_object(this);
  }

  function Var(value) {
    if (!is_var(this))
      return new Var(value);
    this.value = value;
    seal_object(this);
  }

  function Syntax(compile) {
    if (!is_syntax(this))
      return new Syntax(compile);
    this.compile = compile;
    freeze_object(this);
  }

  function is_string(x) { return typeof x === 'string'; }
  function is_symbol(x) { return x instanceof Symbol; }
  function is_cons(x) { return x instanceof Cons; }
  function is_var(x) { return x instanceof Var; }
  function is_syntax(x) { return x instanceof Syntax; }

  var parse = (function () {
    var token_actions, tokens, index, unescape_chars = { '\\n': '\n', '\\r': '\r', '\\t': '\t' };

    function read_expr() {
      var token = read_token();
      if (object_has_own_property(token_actions, token))
        return token_actions[token]();
      if (token.charAt(0) === '"')
        return get_string(token);
      return isNaN(token) ? Symbol(token) : +token;
    }

    function read_seq() {
      var expr;
      if (index >= tokens.length)
        return null;
      expr = read_expr();
      return Cons(expr, read_seq());
    }

    function read_list() {
      var expr;
      if (follows(')'))
        return null;
      expr = read_expr();
      return Cons(expr, follows(':') && match(':') ? read_expr() : read_list());
    }

    function follows(token) {
      return index < tokens.length && tokens[index] === token;
    }

    function match(token) {
      if (read_token() !== token)
        syntax_error('Expected "' + token + '"');
      return true;
    }

    function read_token() {
      if (index >= tokens.length)
        syntax_error('Expected more');
      return tokens[index++];
    }

    function get_string(s) {
      var key;
      s = s.replace(/^"|"$/g, '').replace(/\\([\\"'])/g, '$1');
      for (key in unescape_chars)
        if (object_has_own_property(unescape_chars, key))
          s = s.replace(key, unescape_chars[key]);
      return s;
    }

    function tokenize(s) {
      return s.match(/'|\(|\)|[^\s'()"]+|"([^\\]|\\.)*?"|"/g);
    }

    token_actions = {
      '"': function () { syntax_error('Unclosed string'); },
      ')': function () { syntax_error('Unexpected ")"'); },
      "'": function () {
        return Cons(Symbol('quote'), Cons(read_expr(), null));
      },
      '(': function () {
        var expr = read_list();
        match(')');
        return expr;
      }
    };
    return function (s) {
      var expr;
      tokens = tokenize(s);
      index = 0;
      expr = read_seq();
      if (index < tokens.length)
        syntax_error('Trailing characters');
      return expr;
    };
  }());

  var print = (function () {
    var escape_chars = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };

    function print(s_expr) {
      if (is_string(s_expr))
        return encode_string(s_expr);
      if (is_symbol(s_expr))
        return s_expr.name;
      if (s_expr === null || is_cons(s_expr))
        return print_list(s_expr);
      return '' + s_expr;
    }

    function print_list(list) {
      var strings = [], rest, tail;
      for (rest = list; is_cons(rest); rest = rest.tail)
        strings.push(print(rest.head));
      tail = rest === null ? '' : ' : ' + print(rest);
      return '(' + strings.join(' ') + tail + ')';
    }

    function encode_string(s) {
      var key;
      s = s.replace(/([\\"])/g, '\\$1');
      for (key in escape_chars)
        if (object_has_own_property(escape_chars, key))
          s = s.replace(key, escape_chars[key]);
      return '"' + s + '"';
    }

    return print;
  }());

  var create_global_env = (function () {
    var builtins = complete_builtins({
      'nil': nil,
      'nil?': function (x) { return x === nil; },
      'true': true,
      'false': false,
      'string?': is_string,
      'fn?': is_function,
      'symbol?': is_symbol,
      'cons': function (a, b) { return Cons(a, b); },
      'cons?': is_cons,
      'first': function (x) { return x.head; },
      'rest': function (x) { return x.tail; },
      'var': Var,
      'var?': is_var,
      'deref': function (x) { return x.value; },
      'swap!': swap,
      'apply': function (f, args) { return f.apply({}, list_to_array(args)); },
      '.apply': function (o, f, args) { return o[f].apply(o, list_to_array(args)); },
      '.call': function (o, f) { return o[f].apply(o, Array.prototype.slice.call(arguments, 2)); },
      '+': function () { return sum.apply(null, arguments); },
      '-': function (a, b) { return arguments.length === 1 ? -a : a - b; },
      '*': function () { return product.apply(null, arguments); },
      '/': function (a, b) { return a / b; },
      'remainder': function (a, b) { return a % b; },
      '<': function () { return check_array_pairs(arguments, lower_than); },
      '>': function () { return check_array_pairs(arguments, greater_than); },
      '<=': function () { return check_array_pairs(arguments, lower_than_or_equal); },
      '>=': function () { return check_array_pairs(arguments, greater_than_or_equal); },
      '=': function (a, b) { return equal(a, b); },
      'identical?': function (a, b) { return a === b; },
      '.': function (o, field) { return is_symbol(field) ? o[field.name] : o[field]; },
      'set!': function (o, field, value) { o[is_symbol(field) ? field.name : field] = value; },
      'array': list_to_array,
      'math': Math
    });

    function list_to_array(list) {
      var values = [], rest;
      for (rest = list; is_cons(rest); rest = rest.tail)
        values.push(rest.head);
      return values;
    }

    function swap(variable, value) {
      var v = variable.value;
      variable.value = value;
      return v;
    }

    function equal(a, b) {
      return a === b || is_cons(a) && is_cons(b) && equal(a.head, b.head) && equal(a.tail, b.tail);
    }

    function sum() {
      var i, sum = 0;
      for (i = 0; i < arguments.length; i++)
        sum += arguments[i];
      return sum;
    }

    function product() {
      var i, product = 1;
      for (i = 0; i < arguments.length && product !== 0; i++)
        product *= arguments[i];
      return product;
    }

    function check_array_pairs(array, test_adjacent) {
      var i;
      for (i = 1; i < array.length; i++)
        if (!test_adjacent(array[i - 1], array[i]))
          return false;
      return true;
    }

    function complete_builtins(builtins) {
      var i, primitive_form_names = [ 'quote', 'fn', 'if', 'def', 'do', 'use' ];
      var math_names = [
        'abs', 'min', 'max', 'random', 'round', 'floor', 'ceil', 'sqrt', 'pow',
        'exp', 'log', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2'
      ];
      for (i = 0; i < primitive_form_names.length; i++)
        builtins[primitive_form_names[i]] = nil;
      for (i = 0; i < math_names.length; i++)
        builtins[math_names[i]] = Math[math_names[i]];
      freeze_object(builtins);
      return builtins;
    }

    function lower_than(a, b) { return a < b; }
    function greater_than(a, b) { return a > b; }
    function lower_than_or_equal(a, b) { return a <= b; }
    function greater_than_or_equal(a, b) { return a >= b; }

    function add_bindings(env, bindings) {
      for (var key in bindings)
        if (object_has_own_property(bindings, key))
          define_frozen_property(env, key, bindings[key]);
    }

    return function (external) {
      var env = {};
      add_bindings(env, builtins);
      if (external)
        add_bindings(env, external);
      return env;
    };
  }());

  var compile = (function () {
    var syntax_bindings = {
      'quote': Syntax(function (s_expr) { return s_expr.head; }),
      'fn': Syntax(compile_fn),
      'if': Syntax(compile_if),
      'def': Syntax(compile_def),
      'do': Syntax(compile_do),
      'use': Syntax(compile_use)
    };

    function evaluate(expr, env) {
      return is_function(expr) ? expr(env) : expr;
    }

    function compile(s_expr) {
      if (is_symbol(s_expr))
        return compile_symbol(s_expr);
      if (!is_cons(s_expr))
        return s_expr;
      return has_syntax_defined(s_expr.head) ? compile_syntax(s_expr) : compile_call(s_expr);
    }

    function compile_symbol(symbol) {
      return function (env) {
        if (symbol.parts)
          return compile_symbol_parts(symbol, env);
        if (!(symbol.name in env))
          runtime_error('Symbol "' + print(symbol) + '" not defined');
        return env[symbol.name];
      };
    }

    function compile_symbol_parts(symbol, obj) {
      var i, parts = symbol.parts, context;
      for (i = 0; i < parts.length; i++) {
        if (!(parts[i] in obj))
          runtime_error('Part "' + parts[i] + '" in "' + print(symbol) + '" not defined');
        context = obj;
        obj = obj[parts[i]];
      }
      return is_function(obj) ? function () {
        return obj.apply(context, arguments);
      } : obj;
    }

    function has_syntax_defined(s_expr) {
      return is_symbol(s_expr) && is_syntax(syntax_bindings[s_expr.name]);
    }

    function compile_syntax(s_expr) {
      return syntax_bindings[s_expr.head.name].compile(s_expr.tail);
    }

    function compile_do(s_expr) {
      var seq = map(compile, s_expr);
      return function (env) {
        var rest, res;
        for (rest = seq; is_cons(rest); rest = rest.tail)
          res = evaluate(rest.head, env);
        return res;
      };
    }

    function map(f, list) {
      return !list ? list : Cons(f(list.head), map(f, list.tail));
    }

    function compile_call(s_expr) {
      var expr = map(compile, s_expr), o = {};
      return function (env) {
        var fn = evaluate(expr.head, env), values = [], rest;
        for (rest = expr.tail; is_cons(rest); rest = rest.tail)
          values.push(evaluate(rest.head, env));
        return fn.apply(o, values);
      };
    }

    function compile_fn(s_expr) {
      var names = s_expr.head, body = compile_do(s_expr.tail);
      return function (env) {
        return function () {
          return evaluate(body, bind_args(names, arguments, env));
        };
      };
    }

    function bind_args(names, values, parent_env) {
      var i = 0, rest, env = create_object_from_prototype(parent_env);
      for (rest = names; is_cons(rest); rest = rest.tail)
        define_frozen_property(env, rest.head.name, i < values.length ? values[i++] : nil);
      if (rest)
        define_frozen_property(env, rest.name, array_tail_to_list(values, i));
      return env;
    }

    function array_tail_to_list(values, from) {
      var i, rest = null;
      for (i = values.length - 1; i >= from; i--)
        rest = Cons(values[i], rest);
      return rest;
    }

    function compile_if(s_expr) {
      var cond = compile(s_expr.head),
          t = compile(s_expr.tail.head),
          f = is_cons(s_expr.tail.tail) ? compile(s_expr.tail.tail.head) : nil;
      return function (env) {
        return evaluate(evaluate(cond, env) ? t : f, env);
      };
    }

    function compile_def(s_expr) {
      var pairs;
      if (is_cons(s_expr.head))
        return compile_def_fn(s_expr);
      pairs = get_def_pairs(s_expr);
      return function (env) {
        for (var rest = pairs; is_cons(rest); rest = rest.tail)
          define_binding(rest.head.head, rest.head.tail, env);
      };
    }

    function get_def_pairs(s_expr) {
      var pair;
      if (!s_expr)
        return null;
      pair = Cons(s_expr.head.name, compile(s_expr.tail.head));
      return Cons(pair, get_def_pairs(s_expr.tail.tail));
    }

    function compile_def_fn(s_expr) {
      var fn = compile_fn(Cons(s_expr.head.tail, s_expr.tail));
      return function (env) {
        define_binding(s_expr.head.head.name, fn, env);
      };
    }

    function define_binding(name, expr, env) {
      define_frozen_property(env, name, evaluate(expr, env));
    }

    function compile_use(s_expr) {
      var expr = map(compile, s_expr);
      return function (env) {
        for (var rest = expr; is_cons(rest); rest = rest.tail)
          import_all(evaluate(rest.head, env), env);
      };
    }

    function import_all(module, env) {
      var key;
      if (!module || typeof module !== 'object')
        runtime_error('Not a module');
      for (key in module)
        if (object_has_own_property(module, key))
          define_frozen_property(env, key, module[key]);
    }

    return function (s_expr) {
      var expr = compile_do(s_expr);
      return function (env) {
        return evaluate(expr, env || create_global_env());
      };
    };
  }());

  return {
    read: parse,
    print: print,
    compile: compile,
    eval: function (s_expr) { return compile(s_expr)(); },
    read_eval: function (s) { return compile(parse(s))(); },
    read_eval_print: function (s) { return print(compile(parse(s))()); },
    create: function (bindings) {
      var env = create_global_env(bindings);
      return {
        eval: function (s_expr) { return compile(s_expr)(env); },
        read_eval: function (s) { return compile(parse(s))(env); },
        read_eval_print: function (s) { return print(compile(parse(s))(env)); },
      }
    }
  };
}());
