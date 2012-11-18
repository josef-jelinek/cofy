/*globals window */
/*jslint regexp:true */
var COFY = (function (nil) {
    'use strict';
    var tools, syntax_error, runtime_error, derive_from,
        seal_object, freeze_object, define_frozen_property,
        symbols = {}, multipart, get_symbol_parts,
        Symbol, Cons, LazySeq, Var, Syntax,
        is_string, is_symbol, is_cons, is_lazy_seq, is_var, is_syntax, is_function,
        is_null, is_nil, is_nan, is_falsy, is_pair, is_empty, is_seq,
        head, tail, value,
        parse, printers, create_global_env, compile;

    tools = {

        is_own: function (o, key) {
            return Object.prototype.hasOwnProperty.call(o, key);
        },

        apply: function (fn, args) {
            return fn.apply(null, args);
        },

        slice: function (a, start) {
            return Array.prototype.slice.call(a, start);
        }
    };

    syntax_error = function (message) {
        throw { name: 'SyntaxError', message: message || 'An error' };
    };

    runtime_error = function (message) {
        throw { name: 'RuntimeError', message: message || 'An error' };
    };

    derive_from = Object.create || function (o) {
        function F() {}
        F.prototype = o || Object.prototype;
        return new F();
    };

    seal_object = Object.seal || function (o) {};
    freeze_object = Object.freeze || function (o) {};

    if (Object.defineProperty) {
        define_frozen_property =  function (obj, key, value) {
            Object.defineProperty(obj, key, {
                value: value,
                writable: false,
                enumerable: true,
                configurable: false
            });
        };
    } else {
        define_frozen_property = function (obj, key, value) {
            if (tools.is_own(obj, key)) {
                runtime_error('Redefining "' + key + '"');
            }
            obj[key] = value;
        };
    }

    multipart = new RegExp('^[^/]+(/[^/]+)+$');

    get_symbol_parts = function (name) {
        var i, names = name.split('/'), parts = [];
        for (i = 0; i < names.length; i += 1) {
            parts[i] = /^[0-9]+$/.test(names[i]) ? +names[i] : names[i];
        }
        freeze_object(parts);
        return parts;
    };

    Symbol = function (name) {
        this.name = name;
        if (multipart.test(name)) {
            this.parts = get_symbol_parts(name);
        }
        freeze_object(this);
        symbols[name] = this;
    };

    symbols.quote = new Symbol('quote');

    Cons = function (head, tail) {
        this.head = head;
        this.tail = tail;
        freeze_object(this);
    };

    LazySeq = function (fn) {
        var value, computed = false, compute;

        compute = function () {
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

    Var = function (value) {
        this.value = value;
        seal_object(this); // value stays mutable
    };

    Syntax = function (compile) {
        this.compile = compile;
        freeze_object(this);
    };

    is_string = function (x) { return typeof x === 'string'; };
    is_symbol = function (x) { return x instanceof Symbol; };
    is_cons = function (x) { return x instanceof Cons; };
    is_lazy_seq = function (x) { return x instanceof LazySeq; };
    is_var = function (x) { return x instanceof Var; };
    is_syntax = function (x) { return x instanceof Syntax; };
    // IE8- does not recognize DOM functions (and alert, ...) as 'function' but as 'object'
    if (typeof window.alert === 'function') {
        is_function = function (x) {
            return typeof x === 'function';
        };
    } else {
        is_function = function (x) {
            return typeof x === 'function' || (x !== null && typeof x === 'object' && tools.is_own(x, 'call'));
        };
    }
    is_null = function (x) { return x === null; };
    is_nil = function (x) { return x === nil; };
    is_nan = function (x) { return x !== nil && isNaN(x); };
    is_falsy = function (x) { return x === false || x === null || x === nil; };
    is_pair = function (x) { return is_cons(x) || (is_lazy_seq(x) && is_cons(x.value())); };
    is_empty = function (x) { return is_null(x) || (is_lazy_seq(x) && is_null(x.value())); };
    is_seq = function (x) { return is_pair(x) || is_empty(x); };
    head = function (x) { return is_cons(x) ? x.head : is_pair(x) ? x.head() : nil; };
    tail = function (x) { return is_cons(x) ? x.tail : is_pair(x) ? x.tail() : nil; };
    value = function (x) { return is_lazy_seq(x) ? x.value() : x; };

    // recursive descent parser
    parse = (function () {
        var tokens, index, unescape_chars = { '\\n': '\n', '\\r': '\r', '\\t': '\t' },
            read_expr, read_seq, read_list, follows, match, read_token, get_string,
            remove_comments, tokenize, token_actions;

        read_expr = function () {
            var token = read_token();
            if (tools.is_own(token_actions, token)) {
                return token_actions[token]();
            }
            if (token.charAt(0) === '"') {
                return get_string(token);
            }
            return isNaN(token) ? (is_symbol(symbols[token]) ? symbols[token] : new Symbol(token)) : +token;
        };

        read_seq = function () {
            if (index >= tokens.length) {
                return null;
            }
            var expr = read_expr();
            return new Cons(expr, read_seq());
        };

        read_list = function () {
            if (follows(')')) {
                return null;
            }
            var expr = read_expr();
            return new Cons(expr, follows(':') && match(':') ? read_expr() : read_list());
        };

        follows = function (token) {
            return index < tokens.length && tokens[index] === token;
        };

        match = function (token) {
            if (read_token() !== token) {
                syntax_error('Expected "' + token + '"');
            }
            return true;
        };

        read_token = function () {
            if (index >= tokens.length) {
                syntax_error('Expected more');
            }
            index += 1;
            return tokens[index - 1];
        };

        get_string = function (s) {
            var key;
            s = s.replace(/^"|"$/g, '').replace(/\\([\\"'])/g, '$1');
            for (key in unescape_chars) {
                if (Object.prototype.hasOwnProperty.call(unescape_chars, key)) {
                    s = s.replace(key, unescape_chars[key]);
                }
            }
            return s;
        };

        remove_comments = function (tokens) {
            var i, filtered = [], count = tokens.length;
            for (i = 0; i < count; i += 1) {
                if (tokens[i].charAt(0) !== ';') {
                    filtered.push(tokens[i]);
                }
            }
            return filtered;
        };

        tokenize = function (s) {
            return remove_comments(s.match(/'|\(|\)|;[^\r\n]*|[^\s'()";]+|"([^\\]|\\.)*?"|"/g));
        };

        token_actions = {
            '"': function () { syntax_error('Unclosed string'); },
            ')': function () { syntax_error('Unexpected ")"'); },
            "'": function () {
                return new Cons(symbols.quote, new Cons(read_expr(), null));
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
            if (index < tokens.length) {
                syntax_error('Trailing characters');
            }
            return expr;
        };
    }());

    printers = (function () {
        var encode_string, print, print_seq, show, show_seq,
            escape_chars = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };

        encode_string = function (s) {
            var key;
            s = s.replace(/([\\"])/g, '\\$1');
            for (key in escape_chars) {
                if (Object.prototype.hasOwnProperty.call(escape_chars, key)) {
                    s = s.replace(key, escape_chars[key]);
                }
            }
            return '"' + s + '"';
        };

        // serializer to a string
        print = function (x) {
            if (is_string(x)) {
                return encode_string(x);
            }
            if (is_symbol(x)) {
                return x.name;
            }
            if (is_seq(x)) {
                return print_seq(x);
            }
            return String(value(x));
        };

        print_seq = function (seq) {
            var strings = [], rest, tail_string;
            for (rest = seq; is_pair(rest); rest = tail(rest)) {
                strings.push(print(head(rest)));
            }
            tail_string = is_empty(rest) ? '' : ' : ' + print(rest);
            return '(' + strings.join(' ') + tail_string + ')';
        };

        // converter to a readable string
        show = function (x) {
            if (is_string(x)) {
                return encode_string(x);
            }
            if (is_symbol(x)) {
                return x.name;
            }
            if (is_seq(x)) {
                return show_seq(x, 100);
            }
            return String(value(x));
        };

        show_seq = function (seq, max) {
            var i, strings = [], rest, tail_string;
            for (i = 0, rest = seq; i < max && is_pair(rest); rest = tail(rest), i += 1) {
                strings.push(show(head(rest)));
            }
            tail_string = is_empty(rest) ? '' : i >= max ? ' …' : ' : ' + show(rest);
            return '(' + strings.join(' ') + tail_string + ')';
        };

        return { print: print, show: show };
    }());

    create_global_env = (function () {
        var list_to_array, any, all, swap, equal, seq_equal, sum, product,
            check_array_pairs, array_to_list,
            lower_than, greater_than, lower_than_or_equal, greater_than_or_equal,
            take_seq, skip_seq, filter_seq, map_seq, map_seqs, get_heads, set_tails,
            reduce_seq, zip_seqs, pick_heads, repeat_seq, iterate_seq,
            set_value, add_bindings, complete_builtins, wrap_function, builtins;

        list_to_array = function (list) {
            var values = [], rest;
            for (rest = list; is_pair(rest); rest = tail(rest)) {
                values.push(head(rest));
            }
            return values;
        };

        any = function (fn, values) {
            var i, len = values.length;
            for (i = 0; i < len; i += 1) {
                if (!is_falsy(fn(values[i]))) {
                    return true;
                }
            }
            return false;
        };

        all = function (fn, values) {
            var i, len = values.length;
            for (i = 0; i < len; i += 1) {
                if (is_falsy(fn(values[i]))) {
                    return false;
                }
            }
            return true;
        };

        swap = function (variable, value) {
            var v = variable.value;
            variable.value = value;
            return v;
        };

        equal = function (a, b) {
            return value(a) === value(b) || (is_seq(a) && is_seq(b) && seq_equal(a, b));
        };

        seq_equal = function (a, b) {
            return (is_empty(a) && is_empty(b)) || (is_pair(a) && is_pair(b) && equal(head(a), head(b)) && equal(tail(a), tail(b)));
        };

        sum = function () {
            var i, len = arguments.length, sum = 0;
            for (i = 0; i < len; i += 1) {
                sum += +arguments[i];
            }
            return sum;
        };

        product = function () {
            var i, len = arguments.length, product = 1;
            for (i = 0; i < len && product !== 0; i += 1) {
                product *= +arguments[i];
            }
            return product;
        };

        check_array_pairs = function (array, test_adjacent) {
            var i, len = array.length;
            for (i = 1; i < len; i += 1) {
                if (!test_adjacent(array[i - 1], array[i])) {
                    return false;
                }
            }
            return true;
        };

        array_to_list = function (values, rest) {
            if (rest === nil) {
                rest = null;
            }
            var i;
            for (i = values.length - 1; i >= 0; i -= 1) {
                rest = new Cons(values[i], rest);
            }
            return rest;
        };

        lower_than = function (a, b) { return a < b; };
        greater_than = function (a, b) { return a > b; };
        lower_than_or_equal = function (a, b) { return a <= b; };
        greater_than_or_equal = function (a, b) { return a >= b; };

        take_seq = function (n, seq) {
            n = +n;
            return seq === null ? null : new LazySeq(function f() {
                if (n <= 0 || !is_pair(seq)) {
                    return n <= 0 || is_empty(seq) ? null : value(seq);
                }
                var x = head(seq);
                seq = tail(seq);
                n -= 1;
                return new Cons(x, new LazySeq(f));
            });
        };

        skip_seq = function (n, seq) {
            n = +n;
            return seq === null || is_nan(n) || n - 1 === n ? null : new LazySeq(function () {
                var i;
                for (i = 0; i < n && is_pair(seq); i += 1) {
                    seq = tail(seq);
                }
                return i < n || is_empty(seq) ? null : value(seq);
            });
        };

        filter_seq = function (fn, seq) {
            return seq === null ? null : new LazySeq(function f() {
                while (is_pair(seq) && is_falsy(fn(head(seq)))) {
                    seq = tail(seq);
                }
                if (!is_pair(seq)) {
                    return is_empty(seq) || is_falsy(fn(seq)) ? null : value(seq);
                }
                var x = head(seq);
                seq = tail(seq);
                return new Cons(x, new LazySeq(f));
            });
        };

        map_seq = function (fn, seq) {
            return seq === null ? null : new LazySeq(function f() {
                if (!is_pair(seq)) {
                    return is_empty(seq) ? null : fn(seq);
                }
                var x = fn(head(seq));
                seq = tail(seq);
                return new Cons(x, new LazySeq(f));
            });
        };

        map_seqs = function (fn) {
            var seqs = tools.slice(arguments, 1);
            return new LazySeq(function f() {
                if (!all(is_pair, seqs)) {
                    return any(is_empty, seqs) ? null : tools.apply(fn, seqs);
                }
                var x = tools.apply(fn, get_heads(seqs));
                set_tails(seqs);
                return new Cons(x, new LazySeq(f));
            });
        };

        get_heads = function (values) {
            var i, len = values.length, heads = [];
            for (i = 0; i < len; i += 1) {
                heads[i] = head(values[i]);
            }
            return heads;
        };

        set_tails = function (values) {
            var i, len = values.length;
            for (i = 0; i < len; i += 1) {
                values[i] = is_pair(values[i]) ? tail(values[i]) : null;
            }
        };

        reduce_seq = function (fn, val, seq) {
            if (arguments.length <= 2) {
                return val;
            }
            var x = val, s = seq;
            while (is_pair(s)) {
                x = fn(x, head(s));
                s = tail(s);
            }
            return is_empty(s) ? x : fn(x, value(s));
        };

        zip_seqs = function () {
            var seqs = arguments;
            return new LazySeq(function f() {
                if (all(is_empty, seqs)) {
                    return null;
                }
                var values = pick_heads(seqs);
                set_tails(seqs);
                return array_to_list(values, new LazySeq(f));
            });
        };

        pick_heads = function (values) {
            var i, len = values.length, x, heads = [];
            for (i = 0; i < len; i += 1) {
                x = values[i];
                if (!is_empty(x)) {
                    heads.push(is_pair(x) ? head(x) : value(x));
                }
            }
            return heads;
        };

        repeat_seq = function () {
            var values = arguments;
            return new LazySeq(function f() { return array_to_list(values, new LazySeq(f)); });
        };

        iterate_seq = function (fn, x) {
            return (function f(x) { return new Cons(x, new LazySeq(function () { return f(fn(x)); })); }(x));
        };

        set_value = function (o, s, value) {
            if (is_var(o)) {
                o.value = s;
            } else {
                o[is_symbol(s) ? s.name : s] = value;
            }
        };

        add_bindings = function (env, bindings) {
            var key;
            for (key in bindings) {
                if (Object.prototype.hasOwnProperty.call(bindings, key)) {
                    define_frozen_property(env, key, bindings[key]);
                }
            }
        };

        complete_builtins = function (builtins) {
            var i, primitive_form_names = ['quote', 'fn', 'if', 'def', 'do', 'use'],
                math_names = ['abs', 'round', 'floor', 'ceil', 'sqrt', 'exp', 'log', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan'];
            for (i = 0; i < primitive_form_names.length; i += 1) {
                builtins[primitive_form_names[i]] = nil;
            }
            for (i = 0; i < math_names.length; i += 1) {
                builtins[math_names[i]] = wrap_function(Math[math_names[i]]);
            }
            builtins.pow = function (a, b) { return Math.pow(a, b); };
            builtins.atan2 = function (a, b) { return Math.atan(a, b); };
            builtins.min = function () { return tools.apply(Math.min, arguments); };
            builtins.max = function () { return tools.apply(Math.max, arguments); };
            builtins.random = function () { return Math.random(); };
            builtins.pi = Math.PI;
            builtins.e = Math.E;
            freeze_object(builtins);
            return builtins;
        };

        wrap_function = function (fn) {
            return function (x) {
                return fn(x);
            };
        };

        builtins = complete_builtins({
            'nil': nil,
            'nil?': is_nil,
            'nan': +{}, // NaN
            'nan?': is_nan,
            'true': true,
            'false': false,
            'string?': is_string,
            'fn?': is_function,
            'symbol?': is_symbol,
            'cons': function (x, y) { return new Cons(x, y); },
            'cons?': is_cons,
            'pair?': is_pair,
            'lazy-seq': function (x) { return new LazySeq(x); },
            'lazy-seq?': is_lazy_seq,
            'seq?': is_seq,
            'empty?': is_empty,
            'realized?': function (x) { return is_lazy_seq(x) && x.realized(); },
            'first': head,
            'rest': tail,
            'list': function () { return array_to_list(arguments); },
            'var': function (x) { return new Var(x); },
            'var?': is_var,
            'deref': function (x) { return x.value; },
            'swap!': swap,
            'apply': function (f, args) { return f.apply({}, list_to_array(args)); },
            '.apply': function (o, s, args) { return o[is_symbol(s) ? s.name : s].apply(o, list_to_array(args)); },
            '.call': function (o, s) { return o[is_symbol(s) ? s.name : s].apply(o, tools.slice(arguments, 2)); },
            '+': function () { return tools.apply(sum, arguments); },
            '-': function (a, b) { return arguments.length === 1 ? -a : a - b; },
            '*': function () { return tools.apply(product, arguments); },
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
            'map': function (fn, list) { return arguments.length <= 2 ? map_seq(fn, list) : tools.apply(map_seqs, arguments); },
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
            if (external) {
                add_bindings(env, external);
            }
            return env;
        };
    }());

    // compiler from a data structure to a function taking an environment
    compile = (function () {
        var evaluate, compile, compile_symbol, compile_symbol_parts,
            has_syntax_defined, compile_syntax, compile_do, map, compile_call, compile_fn,
            bind_args, array_tail_to_list, compile_if, compile_def, get_def_pairs, compile_def_fn,
            define_binding, compile_use, import_all, syntax_bindings;

        evaluate = function (expr, env) {
            return is_function(expr) ? expr(env) : expr;
        };

        compile = function (s_expr) {
            var x = value(s_expr);
            if (is_symbol(x)) {
                return compile_symbol(x);
            }
            if (!is_pair(x)) {
                return x;
            }
            return has_syntax_defined(head(x)) ? compile_syntax(x) : compile_call(x);
        };

        compile_symbol = function (symbol) {
            return function (env) {
                if (symbol.parts) {
                    return compile_symbol_parts(symbol, env);
                }
                if (!(symbol.name in env)) {
                    runtime_error('Symbol "' + printers.show(symbol) + '" not defined');
                }
                return env[symbol.name];
            };
        };

        compile_symbol_parts = function (symbol, obj) {
            var i, parts = symbol.parts, context;
            for (i = 0; i < parts.length; i += 1) {
                if (obj) {
                    context = obj;
                    obj = obj[parts[i]];
                }
            }
            return is_function(obj) ? function () { return obj.apply(context, arguments); } : obj;
        };

        has_syntax_defined = function (s_expr) {
            var x = value(s_expr);
            return is_symbol(x) && is_syntax(syntax_bindings[x.name]);
        };

        compile_syntax = function (s_expr) {
            return syntax_bindings[value(head(s_expr)).name].compile(tail(s_expr));
        };

        compile_do = function (s_expr) {
            var seq = map(compile, s_expr);
            return function (env) {
                var rest, res;
                for (rest = seq; is_pair(rest); rest = tail(rest)) {
                    res = evaluate(head(rest), env);
                }
                return res;
            };
        };

        map = function (f, seq) {
            return is_pair(seq) ? new Cons(f(head(seq)), map(f, tail(seq))) : null;
        };

        compile_call = function (s_expr) {
            var expr = map(compile, s_expr), o = {};
            return function (env) {
                var fn = evaluate(head(expr), env), values = [], rest;
                for (rest = tail(expr); is_pair(rest); rest = tail(rest)) {
                    values.push(evaluate(head(rest), env));
                }
                return fn.apply(o, values);
            };
        };

        compile_fn = function (s_expr) {
            var names = head(s_expr), body = compile_do(tail(s_expr));
            return function (env) {
                return function () {
                    return evaluate(body, bind_args(names, arguments, env));
                };
            };
        };

        bind_args = function (names, values, parent_env) {
            var i = 0, rest, env = derive_from(parent_env);
            for (rest = names; is_pair(rest); rest = tail(rest)) {
                define_frozen_property(env, head(rest).name, i < values.length ? values[i] : nil);
                i += 1;
            }
            if (rest !== null) {
                define_frozen_property(env, rest.name, array_tail_to_list(values, i));
            }
            return env;
        };

        array_tail_to_list = function (values, from) {
            var i, rest = null;
            for (i = values.length - 1; i >= from; i -= 1) {
                rest = new Cons(values[i], rest);
            }
            return rest;
        };

        compile_if = function (s_expr) {
            var cond = compile(head(s_expr)),
                t = compile(head(tail(s_expr))),
                f = is_pair(tail(tail(s_expr))) ? compile(head(tail(tail(s_expr)))) : nil;
            return function (env) {
                return evaluate(evaluate(cond, env) ? t : f, env);
            };
        };

        compile_def = function (s_expr) {
            if (is_pair(head(s_expr))) {
                return compile_def_fn(s_expr);
            }
            var pairs = get_def_pairs(s_expr);
            return function (env) {
                var rest;
                for (rest = pairs; is_pair(rest); rest = tail(rest)) {
                    define_binding(head(head(rest)), tail(head(rest)), env);
                }
            };
        };

        get_def_pairs = function (s_expr) {
            if (!s_expr) {
                return null;
            }
            var pair = new Cons(head(s_expr).name, compile(head(tail(s_expr))));
            return new Cons(pair, get_def_pairs(tail(tail(s_expr))));
        };

        compile_def_fn = function (s_expr) {
            var fn = compile_fn(new Cons(tail(head(s_expr)), tail(s_expr)));
            return function (env) {
                define_binding(head(head(s_expr)).name, fn, env);
            };
        };

        define_binding = function (name, expr, env) {
            define_frozen_property(env, name, evaluate(expr, env));
        };

        compile_use = function (s_expr) {
            var expr = map(compile, s_expr);
            return function (env) {
                var rest;
                for (rest = expr; is_pair(rest); rest = tail(rest)) {
                    import_all(evaluate(head(rest), env), env);
                }
            };
        };

        import_all = function (module, env) {
            if (!module || typeof module !== 'object') {
                runtime_error('Not a module');
            }
            var key;
            for (key in module) {
                if (Object.prototype.hasOwnProperty.call(module, key)) {
                    define_frozen_property(env, key, module[key]);
                }
            }
        };

        syntax_bindings = {
            'quote': new Syntax(function (s_expr) { return head(s_expr); }),
            'fn': new Syntax(compile_fn),
            'if': new Syntax(compile_if),
            'def': new Syntax(compile_def),
            'do': new Syntax(compile_do),
            'use': new Syntax(compile_use)
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
            };
        }
    };
}());
