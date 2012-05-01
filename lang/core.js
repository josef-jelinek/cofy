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
  var is_pair = function(x) { return is_cons(x) || is_lazy_seq(x) && is_cons(x.value()); };
  var is_empty = function (x) { return is_null(x) || is_lazy_seq(x) && is_null(x.value()); };
  var is_not_empty = function (x) { return !is_empty(x); };
  var is_seq = function(x) { return is_pair(x) || is_empty(x); };
  var head = function (x) { return is_cons(x) ? x.head : is_pair(x) ? x.head() : nil; };
  var tail = function (x) { return is_cons(x) ? x.tail : is_pair(x) ? x.tail() : nil; };
  var value = function (x) { return is_lazy_seq(x) ? x.value() : x; };

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

  var printers = (function () {
    var escape_chars = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };

    var encode_string = function (s) {
      var key;
      s = s.replace(/([\\"])/g, '\\$1');
      for (key in escape_chars)
        if (object_has_own_property(escape_chars, key))
          s = s.replace(key, escape_chars[key]);
      return '"' + s + '"';
    };

    // serializer to a string
    var print = function (x) {
      if (is_string(x))
        return encode_string(x);
      if (is_symbol(x))
        return x.name;
      if (is_seq(x))
        return print_seq(x);
      return '' + value(x);
    };

    var print_seq = function (seq) {
      var strings = [], rest, tail_string;
      for (rest = seq; is_pair(rest); rest = tail(rest))
        strings.push(print(head(rest)));
      tail_string = is_empty(rest) ? '' : ' : ' + print(rest);
      return '(' + strings.join(' ') + tail_string + ')';
    };

    // converter to a readable string
    var show = function (x) {
      if (is_string(x))
        return encode_string(x);
      if (is_symbol(x))
        return x.name;
      if (is_seq(x))
        return show_seq(x, 100);
      return '' + value(x);
    };

    var show_seq = function (seq, max) {
      var i, strings = [], rest, tail_string;
      for (i = 0, rest = seq; i < max && is_pair(rest); rest = tail(rest), i++)
        strings.push(show(head(rest)));
      tail_string = is_empty(rest) ? '' : i >= max ? ' …' : ' : ' + show(rest);
      return '(' + strings.join(' ') + tail_string + ')';
    };

    return { print: print, show: show };
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
      return value(a) === value(b) || is_seq(a) && is_seq(b) && seq_equal(a, b);
    };

    var seq_equal = function (a, b) {
      return is_empty(a) && is_empty(b) || is_pair(a) && is_pair(b) && equal(head(a), head(b)) && equal(tail(a), tail(b));
    };

    var sum = function () {
      var i, len = arguments.length, sum = 0;
      for (i = 0; i < len; i++)
        sum += +arguments[i];
      return sum;
    };

    var product = function () {
      var i, len = arguments.length, product = 1;
      for (i = 0; i < len && product !== 0; i++)
        product *= +arguments[i];
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

    var take_seq = function (n, seq) {
      if (seq === null)
        return null;
      n = +n;
      var f = function (n, seq) {
        if (n > 0 && is_pair(seq))
          return Cons(head(seq), LazySeq(function () { return f(n - 1, tail(seq)); }));
        return n <= 0 || is_empty(seq) ? null : value(seq);
      };
      return LazySeq(function () { return f(n, seq); });
    };

    var skip_seq = function (n, seq) {
      if (seq === null)
        return null;
      n = +n;
      if (!(n - 1 < n))
        return null;
      return LazySeq(function () {
        var i, rest = seq;
        for (i = 0; i < n && is_pair(rest); i++)
          rest = tail(rest);
        return i < n || is_empty(rest) ? null : value(rest);
      });
    };

    var filter_seq = function (fn, seq) {
      if (seq === null)
        return null;
      var f = function (seq) {
        var rest = seq;
        while (is_pair(rest) && is_falsy(fn(head(rest))))
          rest = tail(rest);
        if (is_pair(rest))
          return Cons(head(rest), LazySeq(function () { return f(tail(rest)); }));
        return is_empty(rest) || is_falsy(fn(rest)) ? null : rest;
      };
      return LazySeq(function () { return f(seq); });
    };

    var map_seq = function (fn, seq) {
      if (seq === null)
        return null;
      var f = function (seq) {
        if (is_pair(seq))
          return Cons(fn(head(seq)), LazySeq(function () { return f(tail(seq)); }));
        return is_empty(seq) ? null : fn(seq);
      };
      return LazySeq(function () { return f(seq); });
    };

    var map_lists = function (fn) {
      var values = [], args;
      for (args = slice(arguments, 1); all(is_cons, args); set_tails(args))
        values.push(apply(fn, get_heads(args)));
      return array_to_list(values, any(is_null, args) ? null : apply(fn, args));
    };

    var get_heads = function (values) {
      var i, len = values.length, heads = Array(len);
      for (i = 0; i < len; i++)
        heads[i] = head(values[i]);
      return heads;
    };

    var set_tails = function (values) {
      for (var i = 0, len = values.length; i < len; i++)
        values[i] = is_pair(values[i]) ? tail(values[i]) : null;
    };

    var reduce_seq = function (fn, val, seq) {
      for (var rest = seq; is_pair(rest); rest = tail(rest))
        val = fn(val, head(rest));
      return is_empty(rest) || seq === nil ? val : fn(val, value(rest));
    };

    var zip_seqs = function () {
      var seqs = arguments;
      var f = function () {
        if (all(is_empty, seqs))
          return null;
        var values = pick_heads(seqs);
        set_tails(seqs);
        return array_to_list(values, LazySeq(f));
      };
      return LazySeq(f);
    };

    var pick_heads = function (values) {
      var i, len = values.length, x, heads = [];
      for (i = 0; i < len; i++) {
        x = values[i];
        if (is_not_empty(x))
          heads.push(is_pair(x) ? head(x) : value(x));
      }
      return heads;
    };

    var repeat_seq = function () {
      var values = arguments;
      var f = function () { return array_to_list(values, LazySeq(f)); };
      return LazySeq(f);
    };

    var iterate_seq = function (fn, x) {
      var f = function (x) { return Cons(x, LazySeq(function () { return f(fn(x)); })); };
      return f(x);
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
      'empty?': is_empty,
      'realized?': function (x) { return is_lazy_seq(x) && x.realized(); },
      'first': head,
      'rest': tail,
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
      'inc': function (x) { return +x + 1; },
      'dec': function (x) { return +x - 1; },
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
      'filter': filter_seq,
      'map': function (fn, list) { return arguments.length <= 2 ? map_seq(fn, list) : apply(map_lists, arguments); },
      'reduce': reduce_seq,
      'zip': zip_seqs,
      'repeat': repeat_seq,
      'iterate': iterate_seq,
      'take': take_seq,
      'skip': skip_seq
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
          runtime_error('Symbol "' + show(symbol) + '" not defined');
        return env[symbol.name];
      };
    };

    var compile_symbol_parts = function (symbol, obj) {
      var i, parts = symbol.parts, context;
      for (i = 0; i < parts.length; i++) {
        if (!(parts[i] in obj))
          runtime_error('Part "' + parts[i] + '" in "' + show(symbol) + '" not defined');
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
    print: printers.print,
    show: printers.show,
    compile: compile,
    eval: function (s_expr) { return value(compile(s_expr)()); },
    read_eval: function (s) { return value(compile(parse(s))()); },
    read_eval_print: function (s) { return printers.print(compile(parse(s))()); },
    read_eval_show: function (s) { return printers.show(compile(parse(s))()); },
    create: function (bindings) {
      var env = create_global_env(bindings);
      return {
        eval: function (s_expr) { return value(compile(s_expr)(env)); },
        read_eval: function (s) { return value(compile(parse(s))(env)); },
        read_eval_print: function (s) { return printers.print(compile(parse(s))(env)); },
        read_eval_show: function (s) { return printers.show(compile(parse(s))(env)); }
      }
    }
  };
}());
