var COFY = (function (nil) {
  'use strict';

  var object_has_own_property = function (o, key) {
    return Object.prototype.hasOwnProperty.call(o, key);
  };
  var syntax_error = function (message) {
    throw { name: 'SyntaxError', message: message || 'An error' };
  };
  var runtime_error = function (message) {
    throw { name: 'RuntimeError', message: message || 'An error' };
  };
  // utilizing ES5 functions if available for immutability
  var derive_from = Object.create || function (o) {
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
  var apply = function (fn, args) { return fn.apply(null, args); };
  var slice = function (a, start) { return Array.prototype.slice.call(a, start); };

  var symbols = {}, multipart = RegExp('^[^/]+(/[^/]+)+$');

  // constructors for language primitives; use without 'new'
  var Symbol = function (name) {
    if (object_has_own_property(symbols, name))
      return symbols[name];
    if (!is_symbol(this))
      return new Symbol(name);
    this.name = name;
    if (multipart.test(name))
      this.parts = get_symbol_parts(name);
    freeze_object(this);
    symbols[name] = this;
  };

  var Cons = function (head, tail) {
    if (!is_cons(this))
      return new Cons(head, tail);
    this.head = head;
    this.tail = tail;
    freeze_object(this);
  };

  var LazySeq = function (fn) {
    if (!is_lazy_seq(this))
      return new LazySeq(fn);
    var value, computed = false, compute = function () {
      if (!computed) {
        value = fn();
        computed = true;
      }
      return value;
    };
    this.value = function () { return compute(); };
    this.head = function () { return compute().head; };
    this.tail = function () { return compute().tail; };
    this.realized = function () { return computed; };
    freeze_object(this);
  };

  var Var = function (value) {
    if (!is_var(this))
      return new Var(value);
    this.value = value;
    seal_object(this); // value stays mutable
  };

  var Syntax = function (compile) {
    if (!is_syntax(this))
      return new Syntax(compile);
    this.compile = compile;
    freeze_object(this);
  };

  var get_symbol_parts = function (name) {
    var i, names = name.split('/'), parts = Array(names.length);
    for (i = 0; i < names.length; i++)
      parts[i] = isNaN(names[i]) ? names[i] : +names[i];
    freeze_object(parts);
    return parts;
  };

  var is_string = function(x) { return typeof x === 'string'; };
  var is_symbol = function(x) { return x instanceof Symbol; };
  var is_cons = function(x) { return x instanceof Cons; };
  var is_lazy_seq = function(x) { return x instanceof LazySeq; };
  var is_seq = function(x) { return is_cons(x) || is_lazy_seq(x); };
  var is_var = function(x) { return x instanceof Var; };
  var is_syntax = function(x) { return x instanceof Syntax; };
  // IE8- does not recognize DOM functions (and alert, ...) as 'function' but as 'object'
  var is_function = typeof alert === 'function' && function (x) {
    return typeof x === 'function';
  } || function (x) {
    return typeof x === 'function' || x !== null && typeof x === 'object' && 'call' in x;
  };
  var is_null = function (x) { return x === null; };
  var is_not_null = function (x) { return x !== null; };
  var is_nil = function (x) { return x === nil; };
  var is_nan = function (x) { return x !== nil && isNaN(x); };
  var is_truthy = function (x) { return x !== false && x !== null && x !== nil; };
  var is_falsy = function (x) { return x === false || x === null || x === nil; };

  // recursive descent parser
  var parse = (function () {
    var tokens, index, unescape_chars = { '\\n': '\n', '\\r': '\r', '\\t': '\t' };

    var read_expr = function () {
      var token = read_token();
      if (object_has_own_property(token_actions, token))
        return token_actions[token]();
      if (token.charAt(0) === '"')
        return get_string(token);
      return isNaN(token) ? Symbol(token) : +token;
    };

    var read_seq = function () {
      var expr;
      if (index >= tokens.length)
        return null;
      expr = read_expr();
      return Cons(expr, read_seq());
    };

    var read_list = function () {
      var expr;
      if (follows(')'))
        return null;
      expr = read_expr();
      return Cons(expr, follows(':') && match(':') ? read_expr() : read_list());
    };

    var follows = function (token) {
      return index < tokens.length && tokens[index] === token;
    };

    var match = function (token) {
      if (read_token() !== token)
        syntax_error('Expected "' + token + '"');
      return true;
    };

    var read_token = function () {
      if (index >= tokens.length)
        syntax_error('Expected more');
      return tokens[index++];
    };

    var get_string = function (s) {
      var key;
      s = s.replace(/^"|"$/g, '').replace(/\\([\\"'])/g, '$1');
      for (key in unescape_chars)
        if (object_has_own_property(unescape_chars, key))
          s = s.replace(key, unescape_chars[key]);
      return s;
    };

    var remove_comments = function (tokens) {
      var filtered = [], count = tokens.length;
      for (var i = 0; i < count; i++)
        if (tokens[i].charAt(0) !== ';')
          filtered.push(tokens[i]);
      return filtered;
    };

    var tokenize = function (s) {
      return remove_comments(s.match(/'|\(|\)|;[^\r\n]*|[^\s'()";]+|"([^\\]|\\.)*?"|"/g));
    };

    var token_actions = {
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

  // serializer to a string
  var print = (function () {
    var escape_chars = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };

    var print = function (s_expr) {
      if (is_string(s_expr))
        return encode_string(s_expr);
      if (is_symbol(s_expr))
        return s_expr.name;
      if (s_expr === null || is_cons(s_expr))
        return print_list(s_expr);
      return '' + s_expr;
    };

    var print_list = function (list) {
      var strings = [], rest, tail;
      for (rest = list; is_cons(rest); rest = rest.tail)
        strings.push(print(rest.head));
      tail = rest === null ? '' : ' : ' + print(rest);
      return '(' + strings.join(' ') + tail + ')';
    };

    var encode_string = function (s) {
      var key;
      s = s.replace(/([\\"])/g, '\\$1');
      for (key in escape_chars)
        if (object_has_own_property(escape_chars, key))
          s = s.replace(key, escape_chars[key]);
      return '"' + s + '"';
    };

    return print;
  }());

  var create_global_env = (function () {
    var list_to_array = function (list) {
      var values = [], rest;
      for (rest = list; is_cons(rest); rest = rest.tail)
        values.push(rest.head);
      return values;
    };

    var any = function (fn, values) {
      for (var i = 0, len = values.length; i < len; i++)
        if (!is_falsy(fn(values[i])))
          return true;
      return false;
    };

    var all = function (fn, values) {
      for (var i = 0, len = values.length; i < len; i++)
        if (is_falsy(fn(values[i])))
          return false;
      return true;
    };

    var swap = function (variable, value) {
      var v = variable.value;
      variable.value = value;
      return v;
    };

    var equal = function (a, b) {
      return a === b || is_cons(a) && is_cons(b) && equal(a.head, b.head) && equal(a.tail, b.tail);
    };

    var sum = function () {
      var i, len = arguments.length, sum = 0;
      for (i = 0; i < len; i++)
        sum += arguments[i];
      return sum;
    };

    var product = function () {
      var i, len = arguments.length, product = 1;
      for (i = 0; i < len && product !== 0; i++)
        product *= arguments[i];
      return product;
    };

    var check_array_pairs = function (array, test_adjacent) {
      for (var i = 1, len = array.length; i < len; i++)
        if (!test_adjacent(array[i - 1], array[i]))
          return false;
      return true;
    };

    var array_to_list = function (values, rest) {
      var i;
      if (rest === nil)
        rest = null;
      for (i = values.length - 1; i >= 0; i--)
        rest = Cons(values[i], rest);
      return rest;
    };

    var lower_than = function (a, b) { return a < b; };
    var greater_than = function (a, b) { return a > b; };
    var lower_than_or_equal = function (a, b) { return a <= b; };
    var greater_than_or_equal = function (a, b) { return a >= b; };

    var set_tails = function (values) {
      for (var i = 0, len = values.length; i < len; i++)
        values[i] = is_cons(values[i]) ? values[i].tail : null;
    };

    var get_heads = function (values) {
      var i, len = values.length, heads = Array(len);
      for (i = 0; i < len; i++)
        heads[i] = values[i].head;
      return heads;
    };

    var filter_list = function (fn, list) {
      var values = [], rest;
      for (rest = list; is_cons(rest); rest = rest.tail)
        if (is_truthy(fn(rest.head)))
          values.push(rest.head);
      return array_to_list(values, rest === null || is_falsy(fn(rest)) ? null : rest);
    };

    var filter_list_n = function (fn) {
      var i, len = arguments.length - 1, values = [], args, x;
      for (args = slice(arguments, 1); any(is_not_null, args); set_tails(args)) {
        for (i = 0; i < len; i++) {
          x = args[i];
          if (is_cons(x)) {
            if (is_truthy(fn(x.head)))
              values.push(x.head);
          } else if (x !== null && is_truthy(fn(x))) {
            values.push(x);
          }
        }
      }
      return array_to_list(values);
    };

    var map_list = function (fn, list) {
      var values = [], rest;
      for (rest = list; is_cons(rest); rest = rest.tail)
        values.push(fn(rest.head));
      return array_to_list(values, rest === null ? null : fn(rest));
    };

    var map_list_n = function (fn) {
      var values = [], args;
      for (args = slice(arguments, 1); all(is_cons, args); set_tails(args))
        values.push(apply(fn, get_heads(args)));
      return array_to_list(values, any(is_null, args) ? null : apply(fn, args));
    };

    var reduce_list = function (fn, value, list) {
      for (var rest = list; is_cons(rest); rest = rest.tail)
        value = fn(value, rest.head);
      return rest === null || list === nil ? value : fn(value, rest);
    };

    var reduce_list_n = function (fn, value) {
      var i, len = arguments.length - 2, args, x;
      for (args = slice(arguments, 2); any(is_not_null, args); set_tails(args)) {
        for (i = 0; i < len; i++) {
          x = args[i];
          if (is_cons(x)) {
            value = fn(value, x.head);
          } else if (x !== null) {
            value = fn(value, x);
          }
        }
      }
      return value;
    };

    var set_value = function (o, s, value) {
      if (is_var(o)) {
        o.value = s;
      } else {
        o[is_symbol(s) ? s.name : s] = value;
      }
    };

    var add_bindings = function (env, bindings) {
      for (var key in bindings)
        if (object_has_own_property(bindings, key))
          define_frozen_property(env, key, bindings[key]);
    };

    var complete_builtins = function (builtins) {
      var i, primitive_form_names = ['quote', 'fn', 'if', 'def', 'do', 'use'];
      var math_names = ['abs', 'round', 'floor', 'ceil', 'sqrt', 'exp', 'log', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan'];
      for (i = 0; i < primitive_form_names.length; i++)
        builtins[primitive_form_names[i]] = nil;
      for (i = 0; i < math_names.length; i++)
        builtins[math_names[i]] = (function (fn) { return function (a) { return fn(a); } }(Math[math_names[i]]));
      builtins['pow'] = function (a, b) { return Math.pow(a, b); };
      builtins['atan2'] = function (a, b) { return Math.atan(a, b); };
      builtins['min'] = function () { return apply(Math.min, arguments); };
      builtins['max'] = function () { return apply(Math.max, arguments); };
      builtins['random'] = function () { return Math.random(); };
      builtins['pi'] = Math.PI;
      builtins['e'] = Math.E;
      freeze_object(builtins);
      return builtins;
    };

    var builtins = complete_builtins({
      'nil': nil,
      'nil?': is_nil,
      'nan': 0/0,
      'nan?': is_nan,
      'true': true,
      'false': false,
      'string?': is_string,
      'fn?': is_function,
      'symbol?': is_symbol,
      'cons': Cons,
      'cons?': is_cons,
      'lazy-seq': LazySeq,
      'lazy-seq?': is_lazy_seq,
      'seq?': is_seq,
      'empty?': function (x) { return x === null || is_lazy_seq(x) && x.value() === null; },
      'realized?': function (x) { return is_lazy_seq(x) && x.realized(); },
      'first': function (x) { return is_cons(x) ? x.head : is_seq ? x.head() : nil; },
      'rest': function (x) { return is_cons(x) ? x.tail : is_seq ? x.tail() : nil; },
      'list': function () { return array_to_list(arguments); },
      'var': Var,
      'var?': is_var,
      'deref': function (x) { return x.value; },
      'swap!': swap,
      'apply': function (f, args) { return f.apply({}, list_to_array(args)); },
      '.apply': function (o, s, args) { return o[is_symbol(s) ? s.name : s].apply(o, list_to_array(args)); },
      '.call': function (o, s) { return o[is_symbol(s) ? s.name : s].apply(o, slice(arguments, 2)); },
      '+': function () { return apply(sum, arguments); },
      '-': function (a, b) { return arguments.length === 1 ? -a : a - b; },
      '*': function () { return apply(product, arguments); },
      '/': function (a, b) { return a / b; },
      'remainder': function (a, b) { return a % b; },
      '<': function () { return check_array_pairs(arguments, lower_than); },
      '>': function () { return check_array_pairs(arguments, greater_than); },
      '<=': function () { return check_array_pairs(arguments, lower_than_or_equal); },
      '>=': function () { return check_array_pairs(arguments, greater_than_or_equal); },
      '=': function (a, b) { return equal(a, b); },
      'identical?': function (a, b) { return a === b; },
      '.': function (o, s) { return is_symbol(s) ? o[s.name] : o[s]; },
      'set!': set_value,
      'array': list_to_array,
      'schedule': function (f, ms) { return setTimeout(f, ms || 0); },
      'unschedule': function (id) { return clearTimeout(id); },
      'filter': function (fn, list) { return arguments.length <= 2 ? filter_list(fn, list) : apply(filter_list_n, arguments); },
      'map': function (fn, list) { return arguments.length <= 2 ? map_list(fn, list) : apply(map_list_n, arguments); },
      'reduce': function (fn, value, list) { return arguments.length <= 3 ? reduce_list(fn, value, list) : apply(reduce_list_n, arguments); }
    });

    return function (external) {
      var env = {};
      add_bindings(env, builtins);
      if (external)
        add_bindings(env, external);
      return env;
    };
  }());

  // compiler from a data structure to a function taking an environment
  var compile = (function () {
    var evaluate = function (expr, env) {
      return is_function(expr) ? expr(env) : expr;
    };

    var compile = function (s_expr) {
      if (is_symbol(s_expr))
        return compile_symbol(s_expr);
      if (!is_cons(s_expr))
        return s_expr;
      return has_syntax_defined(s_expr.head) ? compile_syntax(s_expr) : compile_call(s_expr);
    };

    var compile_symbol = function (symbol) {
      return function (env) {
        if (symbol.parts)
          return compile_symbol_parts(symbol, env);
        if (!(symbol.name in env))
          runtime_error('Symbol "' + print(symbol) + '" not defined');
        return env[symbol.name];
      };
    };

    var compile_symbol_parts = function (symbol, obj) {
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
    };

    var has_syntax_defined = function (s_expr) {
      return is_symbol(s_expr) && is_syntax(syntax_bindings[s_expr.name]);
    };

    var compile_syntax = function (s_expr) {
      return syntax_bindings[s_expr.head.name].compile(s_expr.tail);
    };

    var compile_do = function (s_expr) {
      var seq = map(compile, s_expr);
      return function (env) {
        var rest, res;
        for (rest = seq; is_cons(rest); rest = rest.tail)
          res = evaluate(rest.head, env);
        return res;
      };
    };

    var map = function (f, list) {
      return !list ? list : Cons(f(list.head), map(f, list.tail));
    };

    var compile_call = function (s_expr) {
      var expr = map(compile, s_expr), o = {};
      return function (env) {
        var fn = evaluate(expr.head, env), values = [], rest;
        for (rest = expr.tail; is_cons(rest); rest = rest.tail)
          values.push(evaluate(rest.head, env));
        return fn.apply(o, values);
      };
    };

    var compile_fn = function (s_expr) {
      var names = s_expr.head, body = compile_do(s_expr.tail);
      return function (env) {
        return function () {
          return evaluate(body, bind_args(names, arguments, env));
        };
      };
    };

    var bind_args = function (names, values, parent_env) {
      var i = 0, rest, env = derive_from(parent_env);
      for (rest = names; is_cons(rest); rest = rest.tail)
        define_frozen_property(env, rest.head.name, i < values.length ? values[i++] : nil);
      if (rest)
        define_frozen_property(env, rest.name, array_tail_to_list(values, i));
      return env;
    };

    var array_tail_to_list = function (values, from) {
      var i, rest = null;
      for (i = values.length - 1; i >= from; i--)
        rest = Cons(values[i], rest);
      return rest;
    };

    var compile_if = function (s_expr) {
      var cond = compile(s_expr.head),
          t = compile(s_expr.tail.head),
          f = is_cons(s_expr.tail.tail) ? compile(s_expr.tail.tail.head) : nil;
      return function (env) {
        return evaluate(evaluate(cond, env) ? t : f, env);
      };
    };

    var compile_def = function (s_expr) {
      var pairs;
      if (is_cons(s_expr.head))
        return compile_def_fn(s_expr);
      pairs = get_def_pairs(s_expr);
      return function (env) {
        for (var rest = pairs; is_cons(rest); rest = rest.tail)
          define_binding(rest.head.head, rest.head.tail, env);
      };
    };

    var get_def_pairs = function (s_expr) {
      var pair;
      if (!s_expr)
        return null;
      pair = Cons(s_expr.head.name, compile(s_expr.tail.head));
      return Cons(pair, get_def_pairs(s_expr.tail.tail));
    };

    var compile_def_fn = function (s_expr) {
      var fn = compile_fn(Cons(s_expr.head.tail, s_expr.tail));
      return function (env) {
        define_binding(s_expr.head.head.name, fn, env);
      };
    };

    var define_binding = function (name, expr, env) {
      define_frozen_property(env, name, evaluate(expr, env));
    };

    var compile_use = function (s_expr) {
      var expr = map(compile, s_expr);
      return function (env) {
        for (var rest = expr; is_cons(rest); rest = rest.tail)
          import_all(evaluate(rest.head, env), env);
      };
    };

    var import_all = function (module, env) {
      var key;
      if (!module || typeof module !== 'object')
        runtime_error('Not a module');
      for (key in module)
        if (object_has_own_property(module, key))
          define_frozen_property(env, key, module[key]);
    };

    var syntax_bindings = {
      'quote': Syntax(function (s_expr) { return s_expr.head; }),
      'fn': Syntax(compile_fn),
      'if': Syntax(compile_if),
      'def': Syntax(compile_def),
      'do': Syntax(compile_do),
      'use': Syntax(compile_use)
    };

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
        read_eval_print: function (s) { return print(compile(parse(s))(env)); }
      }
    }
  };
}());
