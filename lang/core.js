/*global window */
/*jslint regexp:true,evil:true */

/**
 *
 * @author Josef Jelinek josef.jelinek@gmail.com
 * @license Public Domain - Use at your own risk
 */
var COFY = (function (nil) {
    'use strict';
    var tools, is, syntax_error, runtime_error,
        symbols = {}, get_symbol_parts, Symbol, Cons, Lazy, Var, Syntax,
        head, tail, value, parse, printers, create_global_env, compile;

    tools = {
        is_in: new Function('o', 'key', 'return key in o;'),

        is_own: function (o, key) {
            return Object.prototype.hasOwnProperty.call(o, key);
        },

        slice: function (a, start) {
            return Array.prototype.slice.call(a, start);
        }
    };

    tools.derive = Object.create || function (o) {
        function F() {}
        F.prototype = o || Object.prototype;
        return new F();
    };

    is = {
        string: function (x) { return typeof x === 'string'; },
        fn: function (x) { return typeof x === 'function'; },
        Symbol: function (x) { return x instanceof Symbol; },
        Cons: function (x) { return x instanceof Cons; },
        Lazy: function (x) { return x instanceof Lazy; },
        Var: function (x) { return x instanceof Var; },
        Syntax: function (x) { return x instanceof Syntax; },
        NaN: new Function('x', 'return x !== x;'),
        falsy: function (x) { return x === false || x === null || x === nil; },
        pair: function (x) { return is.Cons(x) || (is.Lazy(x) && is.Cons(x.value())); },
        empty: function (x) { return x === null || (is.Lazy(x) && x.value() === null); },
        stream: function (x) { return is.pair(x) || is.empty(x); }
    };

    // IE8- does not recognize DOM functions (and alert, ...) as 'function' but as 'object'
    if (typeof window.alert !== 'function') {

        is.fn = function (x) {
            return typeof x === 'function' || (x !== null && typeof x === 'object' && tools.is_own(x, 'call'));
        };
    }

    syntax_error = function (message) {
        throw { name: 'SyntaxError', message: message || 'An error' };
    };

    runtime_error = function (message) {
        throw { name: 'RuntimeError', message: message || 'An error' };
    };

    Symbol = function (name) {
        this.name = name;
        if (/^[^\/]+(\/[^\/]+)+$/.test(name)) {
            this.parts = get_symbol_parts(name);
        }
        symbols[name] = this;
    };

    get_symbol_parts = function (name) {
        var i, names = name.split('/'), parts = [];
        for (i = 0; i < names.length; i += 1) {
            parts[i] = /^[0-9]+$/.test(names[i]) ? +names[i] : names[i];
        }
        return parts;
    };

    symbols.quote = new Symbol('quote');

    Cons = function (head, tail) {
        this.head = head;
        this.tail = tail;
    };

    Lazy = function (fn) {
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
    };

    Var = function (value) {
        this.value = value;
    };

    Syntax = function (compile) {
        this.compile = compile;
    };

    head = function (x) { return is.Cons(x) ? x.head : is.pair(x) ? x.head() : nil; };
    tail = function (x) { return is.Cons(x) ? x.tail : is.pair(x) ? x.tail() : nil; };
    value = function (x) { return is.Lazy(x) ? x.value() : x; };

    // recursive descent parser
    parse = (function () {
        var tokens, index, unescape_chars = { '\\n': '\n', '\\r': '\r', '\\t': '\t' },
            read_expr, read_stream, read_list, follows, match, read_token, get_string,
            remove_comments, tokenize, token_actions;

        read_expr = function () {
            var token = read_token();
            if (tools.is_own(token_actions, token)) {
                return token_actions[token]();
            }
            if (token.charAt(0) === '"') {
                return get_string(token);
            }
            return !is.NaN(+token) ? +token
                                   : is.Symbol(symbols[token]) ? symbols[token] : new Symbol(token);
        };

        read_stream = function () {
            if (index >= tokens.length) {
                return null;
            }
            var expr = read_expr();
            return new Cons(expr, read_stream());
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
            expr = read_stream();
            if (index < tokens.length) {
                syntax_error('Trailing characters');
            }
            return expr;
        };
    }());

    printers = (function () {
        var encode_string, print, print_stream, show, show_stream,
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
            if (is.string(x)) {
                return encode_string(x);
            }
            if (is.Symbol(x)) {
                return x.name;
            }
            if (is.stream(x)) {
                return print_stream(x);
            }
            return String(value(x));
        };

        print_stream = function (stream) {
            var strings = [], rest, tail_string;
            for (rest = stream; is.pair(rest); rest = tail(rest)) {
                strings.push(print(head(rest)));
            }
            tail_string = is.empty(rest) ? '' : ' : ' + print(rest);
            return '(' + strings.join(' ') + tail_string + ')';
        };

        // converter to a readable string
        show = function (x) {
            if (is.string(x)) {
                return encode_string(x);
            }
            if (is.Symbol(x)) {
                return x.name;
            }
            if (is.stream(x)) {
                return show_stream(x, 100);
            }
            return String(value(x));
        };

        show_stream = function (stream, max) {
            var i, strings = [], rest, tail_string;
            for (i = 0, rest = stream; i < max && is.pair(rest); rest = tail(rest), i += 1) {
                strings.push(show(head(rest)));
            }
            tail_string = is.empty(rest) ? '' : i >= max ? ' …' : ' : ' + show(rest);
            return '(' + strings.join(' ') + tail_string + ')';
        };

        return { print: print, show: show };
    }());

    create_global_env = (function () {
        var list_to_array, any, all, swap, equal, stream_equal, sum, product,
            check_array_pairs, array_to_list,
            lower_than, greater_than, lower_than_or_equal, greater_than_or_equal,
            take_stream, skip_stream, filter_stream, map_stream, map_streams, get_heads, set_tails,
            reduce_stream, zip_streams, pick_heads, repeat_stream, iterate_stream,
            set_value, add_bindings, complete_builtins, wrap_function, builtins;

        list_to_array = function (list) {
            var values = [], rest;
            for (rest = list; is.pair(rest); rest = tail(rest)) {
                values.push(head(rest));
            }
            return values;
        };

        any = function (fn, values) {
            var i, len = values.length;
            for (i = 0; i < len; i += 1) {
                if (!is.falsy(fn(values[i]))) {
                    return true;
                }
            }
            return false;
        };

        all = function (fn, values) {
            var i, len = values.length;
            for (i = 0; i < len; i += 1) {
                if (is.falsy(fn(values[i]))) {
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
            return value(a) === value(b) || (is.stream(a) && is.stream(b) && stream_equal(a, b));
        };

        stream_equal = function (a, b) {
            return (is.empty(a) && is.empty(b)) || (is.pair(a) && is.pair(b) && equal(head(a), head(b)) && equal(tail(a), tail(b)));
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

        take_stream = function (n, stream) {
            n = +n;
            return stream === null ? null : new Lazy(function f() {
                if (n <= 0 || !is.pair(stream)) {
                    return n <= 0 || is.empty(stream) ? null : value(stream);
                }
                var x = head(stream);
                stream = tail(stream);
                n -= 1;
                return new Cons(x, new Lazy(f));
            });
        };

        skip_stream = function (n, stream) {
            n = +n;
            return stream === null || is.NaN(n) || n - 1 === n ? null : new Lazy(function () {
                var i;
                for (i = 0; i < n && is.pair(stream); i += 1) {
                    stream = tail(stream);
                }
                return i < n || is.empty(stream) ? null : value(stream);
            });
        };

        filter_stream = function (fn, stream) {
            return stream === null ? null : new Lazy(function f() {
                while (is.pair(stream) && is.falsy(fn(head(stream)))) {
                    stream = tail(stream);
                }
                if (!is.pair(stream)) {
                    return is.empty(stream) || is.falsy(fn(stream)) ? null : value(stream);
                }
                var x = head(stream);
                stream = tail(stream);
                return new Cons(x, new Lazy(f));
            });
        };

        map_stream = function (fn, stream) {
            return stream === null ? null : new Lazy(function f() {
                if (!is.pair(stream)) {
                    return is.empty(stream) ? null : fn(stream);
                }
                var x = fn(head(stream));
                stream = tail(stream);
                return new Cons(x, new Lazy(f));
            });
        };

        map_streams = function (fn) {
            var streams = tools.slice(arguments, 1);
            return new Lazy(function f() {
                if (!all(is.pair, streams)) {
                    return any(is.empty, streams) ? null : fn.apply({}, streams);
                }
                var x = fn.apply({}, get_heads(streams));
                set_tails(streams);
                return new Cons(x, new Lazy(f));
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
                values[i] = is.pair(values[i]) ? tail(values[i]) : null;
            }
        };

        reduce_stream = function (fn, val, stream) {
            if (arguments.length <= 2) {
                return val;
            }
            var x = val, s = stream;
            while (is.pair(s)) {
                x = fn(x, head(s));
                s = tail(s);
            }
            return is.empty(s) ? x : fn(x, value(s));
        };

        zip_streams = function () {
            var streams = arguments;
            return new Lazy(function f() {
                if (all(is.empty, streams)) {
                    return null;
                }
                var values = pick_heads(streams);
                set_tails(streams);
                return array_to_list(values, new Lazy(f));
            });
        };

        pick_heads = function (values) {
            var i, len = values.length, x, heads = [];
            for (i = 0; i < len; i += 1) {
                x = values[i];
                if (!is.empty(x)) {
                    heads.push(is.pair(x) ? head(x) : value(x));
                }
            }
            return heads;
        };

        repeat_stream = function () {
            var values = arguments;
            return new Lazy(function f() { return array_to_list(values, new Lazy(f)); });
        };

        iterate_stream = function (fn, x) {
            return (function f(x) { return new Cons(x, new Lazy(function () { return f(fn(x)); })); }(x));
        };

        set_value = function (o, s, value) {
            if (is.Var(o)) {
                o.value = s;
            } else {
                o[is.Symbol(s) ? s.name : s] = value;
            }
        };

        add_bindings = function (env, bindings) {
            var key;
            for (key in bindings) {
                if (Object.prototype.hasOwnProperty.call(bindings, key)) {
                    if (Object.prototype.hasOwnProperty.call(env, key)) {
                        runtime_error('Redefining "' + key + '"');
                    }
                    env[key] = bindings[key];
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
            builtins.atan2 = function (a, b) { return Math.atan2(a, b); };
            builtins.min = function () { return Math.min.apply(null, arguments); };
            builtins.max = function () { return Math.max.apply(null, arguments); };
            builtins.random = function () { return Math.random(); };
            builtins.pi = Math.PI;
            builtins.e = Math.E;
            return builtins;
        };

        wrap_function = function (fn) {
            return function (x) { return fn(x); };
        };

        builtins = complete_builtins({
            'nil': nil,
            'nan': +{}, // NaN
            'nan?': is.NaN,
            'true': true,
            'false': false,
            'string?': is.string,
            'fn?': is.fn,
            'symbol?': is.Symbol,
            'cons': function (x, y) { return new Cons(x, y); },
            'cons?': is.Cons,
            'pair?': is.pair,
            'lazy': function (x) { return new Lazy(x); },
            'lazy?': is.Lazy,
            'stream?': is.stream,
            'empty?': is.empty,
            'realized?': function (x) { return is.Lazy(x) && x.realized(); },
            'head': head,
            'tail': tail,
            'list': function () { return array_to_list(arguments); },
            'var': function (x) { return new Var(x); },
            'var?': is.Var,
            'deref': function (x) { return x.value; },
            'swap!': swap,
            'apply': function (f, args) { return f.apply({}, list_to_array(args)); },
            '.apply': function (o, s, args) { return o[is.Symbol(s) ? s.name : s].apply(o, list_to_array(args)); },
            '.call': function (o, s) { return o[is.Symbol(s) ? s.name : s].apply(o, tools.slice(arguments, 2)); },
            '+': function () { return sum.apply(null, arguments); },
            '-': function (a, b) { return arguments.length === 1 ? -a : a - b; },
            '*': function () { return product.apply(null, arguments); },
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
            '.': function (o, s) { return is.Symbol(s) ? o[s.name] : o[s]; },
            'set!': set_value,
            'array': list_to_array,
            'schedule': function (f, ms) { return setTimeout(f, ms || 0); },
            'unschedule': function (id) { return clearTimeout(id); },
            'filter': filter_stream,
            'map': function (fn, list) { return arguments.length <= 2 ? map_stream(fn, list) : map_streams.apply({}, arguments); },
            'reduce': reduce_stream,
            'zip': zip_streams,
            'repeat': repeat_stream,
            'iterate': iterate_stream,
            'take': take_stream,
            'skip': skip_stream
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
            has_syntax_defined, compile_syntax, compile_do,
            compile_call, compile_symbol_call, compile_symbol_parts_call, compile_non_symbol_call, compile_fn,
            bind_args, array_tail_to_list, compile_if, compile_def, get_def_pairs, compile_def_fn,
            define_binding, compile_use, import_all, syntax_bindings;

        evaluate = function (expr, env) {
            return is.fn(expr) ? expr(env) : expr;
        };

        compile = function (s_expr) {
            var x = value(s_expr);
            if (is.Symbol(x)) {
                return compile_symbol(x);
            }
            if (!is.pair(x)) {
                return x;
            }
            return has_syntax_defined(head(x)) ? compile_syntax(x) : compile_call(x);
        };

        compile_symbol = function (symbol) {
            if (symbol.parts) {
                return compile_symbol_parts(symbol.parts);
            }
            var name = symbol.name;
            return function (env) {
                if (!tools.is_in(env, name)) {
                    runtime_error('Symbol "' + printers.show(symbol) + '" not defined');
                }
                return env[name];
            };
        };

        compile_symbol_parts = function (parts) {
            var i, os = '', fs, fns;
            for (i = 0; i < parts.length - 1; i += 1) {
                os += '[' + printers.print(parts[i]) + ']';
            }
            fs = '[' + printers.print(parts[parts.length - 1]) + ']';
            fns = 'function(){return f.apply(o, arguments)}';
            return eval('(function(env){var o=env' + os + ',f=o' + fs +';return is.fn(f)?' + fns + ':f})');
        };

        has_syntax_defined = function (s_expr) {
            var x = value(s_expr);
            return is.Symbol(x) && is.Syntax(syntax_bindings[x.name]);
        };

        compile_syntax = function (s_expr) {
            return syntax_bindings[value(head(s_expr)).name].compile(tail(s_expr));
        };

        compile_do = function (s_expr) {
            var rest, a = [];
            for (rest = s_expr; is.pair(rest); rest = tail(rest)) {
                a.push(compile(head(rest)));
            }
            return function (env) {
                var i, len = a.length, res;
                for (i = 0; i < len; i += 1) {
                    res = evaluate(a[i], env);
                }
                return res;
            };
        };

        compile_call = function (s_expr) {
            var rest, x = value(head(s_expr)), args = [];
            for (rest = tail(s_expr); is.pair(rest); rest = tail(rest)) {
                args.push(compile(head(rest)));
            }
            if (is.Symbol(x)) {
                return compile_symbol_call(x, args);
            }
            return compile_non_symbol_call(compile(x), args);
        };

        compile_symbol_call = function (symbol, args) {
            if (symbol.parts) {
                return compile_symbol_parts_call(symbol, args);
            }
            var name = symbol.name;
            return function (env) {
                var i, len = args.length, fn = env[name], values = [];
                if (!fn && !tools.is_in(env, fn)) {
                    runtime_error('Function "' + printers.show(symbol) + '" not defined');
                }
                for (i = 0; i < len; i += 1) {
                    values.push(evaluate(args[i], env));
                }
                return fn.apply({}, values); // {} isolating from global window access
            };
        };

        compile_symbol_parts_call = function (symbol, args) {
            var i, parts = symbol.parts, js = '', as = [];
            for (i = 0; i < parts.length; i += 1) {
                js += '[' + printers.print(parts[i]) + ']';
            }
            for (i = 0; i < args.length; i += 1) {
                as.push('evaluate(args[' + i + '], env)');
            }
            return eval('(function(env){return env' + js + '(' + as.join(',') + ')})');
        };

        compile_non_symbol_call = function (fn_expr, args) {
            return function (env) {
                var i, len = args.length, fn = evaluate(fn_expr, env), values = [];
                for (i = 0; i < len; i += 1) {
                    values.push(evaluate(args[i], env));
                }
                return fn.apply({}, values); // {} isolating from global window access
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
            var i = 0, name, rest, env = tools.derive(parent_env);
            for (rest = names; is.pair(rest); rest = tail(rest)) {
                name = head(rest).name;
                if (Object.prototype.hasOwnProperty.call(env, name)) {
                    runtime_error('Redefining "' + name + '"');
                }
                env[name] = i < values.length ? values[i] : nil;
                i += 1;
            }
            if (rest !== null) {
                name = rest.name;
                if (Object.prototype.hasOwnProperty.call(env, name)) {
                    runtime_error('Redefining "' + name + '"');
                }
                env[name] = array_tail_to_list(values, i);
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
                f = is.pair(tail(tail(s_expr))) ? compile(head(tail(tail(s_expr)))) : nil;
            return function (env) {
                return evaluate(evaluate(cond, env) ? t : f, env);
            };
        };

        compile_def = function (s_expr) {
            if (is.pair(head(s_expr))) {
                return compile_def_fn(s_expr);
            }
            var pairs = get_def_pairs(s_expr);
            return function (env) {
                var rest;
                for (rest = pairs; is.pair(rest); rest = tail(rest)) {
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
            if (Object.prototype.hasOwnProperty.call(env, name)) {
                runtime_error('Redefining "' + name + '"');
            }
            env[name] = evaluate(expr, env);
        };

        compile_use = function (s_expr) {
            var rest, a = [];
            for (rest = s_expr; is.pair(rest); rest = tail(rest)) {
                a.push(compile(head(rest)));
            }
            return function (env) {
                var i, len = a.length;
                for (i = 0; i < len; i += 1) {
                    import_all(evaluate(a[i], env), env);
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
                    if (Object.prototype.hasOwnProperty.call(env, key)) {
                        runtime_error('Redefining "' + key + '"');
                    }
                    env[key] = module[key];
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
