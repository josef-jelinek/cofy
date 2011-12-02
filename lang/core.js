var COFY = (function (nil) {
  'use strict';

  function objectHasOwnProperty(o, key) {
    return Object.prototype.hasOwnProperty.call(o, key);
  }

  function syntaxError(message) {
    throw { name: 'SyntaxError', message: message || 'An error' };
  }

  function runtimeError(message) {
    throw { name: 'RuntimeError', message: message || 'An error' };
  }

  var createObjectFromPrototype = Object.create || function (o) {
    function F() {}
    F.prototype = o || Object.prototype;
    return new F();
  };
  var sealObject = Object.seal || function (o) {};
  var freezeObject = Object.freeze || function (o) {};
  var freezeObjectProperty = Object.defineProperty  && Object.freeze && function (obj, key) {
    Object.defineProperty(obj, key, {
      writable: false,
      enumerable: true,
      configurable: false
    });
  } || function () {};
  var defineFrozenProperty = Object.defineProperty && Object.freeze && function (obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      writable: false,
      enumerable: true,
      configurable: false
    });
  } || function (obj, key, value) {
    if (objectHasOwnProperty(obj, key))
      runtimeError('Redefining ' + name);
    obj[key] = value;
  };

  var symbols = {}, multipart = RegExp('^[^/]+(/[^/]+)+$');

  function Symbol(name) {
    if (objectHasOwnProperty(symbols, name))
      return symbols[name];
    if (!isSymbol(this))
      return new Symbol(name);
    this.name = name;
    if (multipart.test(name))
      this.parts = get_symbol_parts(name);
    freezeObject(this);
    symbols[name] = this;
  }

  function get_symbol_parts(name) {
    var i, names = name.split('/'), parts = Array(names.length);
    for (i = 0; i < names.length; i++)
      parts[i] = isNaN(names[i]) ? names[i] : +names[i];
    freezeObject(parts);
    return parts;
  }

  function Cons(head, tail) {
    if (!isCons(this))
      return new Cons(head, tail);
    this.head = head;
    this.tail = tail;
    freezeObject(this);
  }

  function Var(value) {
    if (!isVar(this))
      return new Var(value);
    this.value = value;
    sealObject(this);
  }

  function Syntax(compile) {
    if (!isSyntax(this))
      return new Syntax(compile);
    this.compile = compile;
    freezeObject(this);
  }

  function isString(x) { return typeof x === 'string'; }
  function isFunction(x) { return typeof x === 'function'; }
  function isSymbol(x) { return x instanceof Symbol; }
  function isCons(x) { return x instanceof Cons; }
  function isVar(x) { return x instanceof Var; }
  function isSyntax(x) { return x instanceof Syntax; }

  var parse = (function () {
    var token_actions, tokens, index, unescape_chars = { '\\n': '\n', '\\r': '\r', '\\t': '\t' };

    function read_expr() {
      var token = read_token();
      if (objectHasOwnProperty(token_actions, token))
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
        syntaxError('Expected "' + token + '"');
      return true;
    }

    function read_token() {
      if (index >= tokens.length)
        syntaxError('Expected more');
      return tokens[index++];
    }

    function get_string(s) {
      var key;
      s = s.replace(/^"|"$/g, '').replace(/\\([\\"'])/g, '$1');
      for (key in unescape_chars)
        if (objectHasOwnProperty(unescape_chars, key))
          s = s.replace(key, unescape_chars[key]);
      return s;
    }

    function tokenize(s) {
      return s.match(/'|\(|\)|[^\s'()"]+|"([^\\]|\\.)*?"|"/g);
    }

    token_actions = {
      '"': function () { syntaxError('Unclosed string'); },
      ')': function () { syntaxError('Unexpected ")"'); },
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
        syntaxError('Trailing characters');
      return expr;
    };
  }());

  var print = (function () {
    var escape_chars = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };

    function print(s_expr) {
      if (isString(s_expr))
        return encode_string(s_expr);
      if (isSymbol(s_expr))
        return s_expr.name;
      if (s_expr === null || isCons(s_expr))
        return print_list(s_expr);
      return '' + s_expr;
    }

    function print_list(list) {
      var strings = [], rest, tail;
      for (rest = list; isCons(rest); rest = rest.tail)
        strings.push(print(rest.head));
      tail = rest === null ? '' : ' : ' + print(rest);
      return '(' + strings.join(' ') + tail + ')';
    }

    function encode_string(s) {
      var key;
      s = s.replace(/([\\"])/g, '\\$1');
      for (key in escape_chars)
        if (objectHasOwnProperty(escape_chars, key))
          s = s.replace(key, escape_chars[key]);
      return '"' + s + '"';
    }

    return print;
  }());

  var create_global_env = (function () {

    function list_to_array(list) {
      var values = [], rest;
      for (rest = list; isCons(rest); rest = rest.tail)
        values.push(rest.head);
      return values;
    }

    function swap(variable, value) {
      var v = variable.value;
      variable.value = value;
      return v;
    }

    function equal(a, b) {
      return a === b || isCons(a) && isCons(b) && equal(a.head, b.head) && equal(a.tail, b.tail);
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
      freezeObject(builtins);
      return builtins;
    }

    function lower_than(a, b) { return a < b; }
    function greater_than(a, b) { return a > b; }
    function lower_than_or_equal(a, b) { return a <= b; }
    function greater_than_or_equal(a, b) { return a >= b; }

    var builtins = complete_builtins({
      'nil': nil,
      'nil?': function (x) { return x === nil; },
      'true': true,
      'false': false,
      'string?': isString,
      'fn?': isFunction,
      'symbol?': isSymbol,
      'cons': function (a, b) { return Cons(a, b); },
      'cons?': isCons,
      'first': function (x) { return x.head; },
      'rest': function (x) { return x.tail; },
      'var': Var,
      'var?': isVar,
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
      '.': function (o, field) { return isSymbol(field) ? o[field.name] : o[field]; },
      'set!': function (o, field, value) { o[isSymbol(field) ? field.name : field] = value; },
      'array': list_to_array,
      'math': Math
    });

    return function (external) {
      var key, env = {};
      for (key in builtins)
        if (objectHasOwnProperty(builtins, key))
          defineFrozenProperty(env, key, builtins[key]);
      if (external)
        for (key in external)
          if (objectHasOwnProperty(external, key))
            defineFrozenProperty(env, key, external[key]);
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
      return isFunction(expr) ? expr(env) : expr;
    }

    function compile(s_expr) {
      if (isSymbol(s_expr))
        return compile_symbol(s_expr);
      if (!isCons(s_expr))
        return s_expr;
      return has_syntax_defined(s_expr.head) ? compile_syntax(s_expr) : compile_call(s_expr);
    }

    function compile_symbol(symbol) {
      return function (env) {
        if (symbol.parts)
          return compile_symbol_parts(symbol, env);
        if (!(symbol.name in env))
          runtimeError('Symbol "' + print(symbol) + '" not defined');
        return env[symbol.name];
      };
    }

    function compile_symbol_parts(symbol, obj) {
      var i, parts = symbol.parts, context;
      for (i = 0; i < parts.length; i++) {
        if (!(parts[i] in obj))
          runtimeError('Part "' + parts[i] + '" in "' + print(symbol) + '" not defined');
        context = obj;
        obj = obj[parts[i]];
      }
      return isFunction(obj) ? function () {
        return obj.apply(context, arguments);
      } : obj;
    }

    function has_syntax_defined(s_expr) {
      return isSymbol(s_expr) && isSyntax(syntax_bindings[s_expr.name]);
    }

    function compile_syntax(s_expr) {
      return syntax_bindings[s_expr.head.name].compile(s_expr.tail);
    }

    function compile_call(s_expr) {
      var expr = map(compile, s_expr), o = {};
      return function (env) {
        var fn = evaluate(expr.head, env), values = [], rest;
        if (!isFunction(fn))
          runtimeError('Not a function: ' + print(s_expr.head));
        for (rest = expr.tail; isCons(rest); rest = rest.tail)
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

    function compile_if(s_expr) {
      var cond = compile(s_expr.head),
          t = compile(s_expr.tail.head),
          f = isCons(s_expr.tail.tail) ? compile(s_expr.tail.tail.head) : nil;
      return function (env) {
        return evaluate(evaluate(cond, env) ? t : f, env);
      };
    }

    function compile_def(s_expr) {
      var pairs;
      if (isCons(s_expr.head))
        return compile_def_fn(s_expr);
      pairs = get_def_pairs(s_expr);
      return function (env) {
        var rest;
        for (rest = pairs; isCons(rest); rest = rest.tail)
          define_binding(rest.head.head, rest.head.tail, env);
      };
    }

    function compile_def_fn(s_expr) {
      var fn = compile_fn(Cons(s_expr.head.tail, s_expr.tail));
      return function (env) {
        define_binding(s_expr.head.head.name, fn, env);
      };
    }

    function compile_do(s_expr) {
      var seq = map(compile, s_expr);
      return function (env) {
        var rest, res;
        for (rest = seq; isCons(rest); rest = rest.tail)
          res = evaluate(rest.head, env);
        return res;
      };
    }

    function compile_use(s_expr) {
      return function (env) {
        var rest;
        for (rest = s_expr; isCons(rest); rest = rest.tail) {
          if (rest.head.parts) {
            import_one(rest.head.parts, env);
          } else {
            import_all(rest.head.name, env);
          }
        }
      };
    }

    function import_one(parts, env) {
      var i, obj = env, name = parts[parts.length - 1];
      if (objectHasOwnProperty(env, name))
        runtimeError('Binding "' + name + '" already exists');
      for (i = 0; i < parts.length; i++)
        obj = obj[parts[i]];
      env[name] = obj;
    }

    function import_all(name, env) {
      var key, module = env[name];
      if (!module || typeof module !== 'object')
        runtimeError('Module "' + name + '" not found');
      for (key in module) {
        if (objectHasOwnProperty(module, key)) {
          if (objectHasOwnProperty(env, key))
            runtimeError('Binding "' + key + '" already exists');
          env[key] = module[key];
        }
      }
    }

    function bind_args(names, values, parent_env) {
      var i = 0, rest, env = createObjectFromPrototype(parent_env);
      for (rest = names; isCons(rest); rest = rest.tail)
        defineFrozenProperty(env, rest.head.name, i < values.length ? values[i++] : nil);
      if (rest)
        defineFrozenProperty(env, rest.name, array_tail_to_list(values, i));
      return env;
    }

    function array_tail_to_list(values, from) {
      var i, rest = null;
      for (i = values.length - 1; i >= from; i--)
        rest = Cons(values[i], rest);
      return rest;
    }

    function define_binding(name, expr, env) {
      defineFrozenProperty(env, name, evaluate(expr, env));
    }

    function get_def_pairs(s_expr) {
      var pair;
      if (!s_expr)
        return null;
      pair = Cons(s_expr.head.name, compile(s_expr.tail.head));
      return Cons(pair, get_def_pairs(s_expr.tail.tail));
    }

    function map(f, list) {
      return !list ? list : Cons(f(list.head), map(f, list.tail));
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
