/*globals define, document */
/*jslint es5: true */

define('test-cofy', ['cofy/core'], function (COFY) {
    'use strict';
    return {
        read: {

            constants: function () {
                this.is.same(COFY.read('0').head, 0);
                this.is.same(COFY.read('"hello"').head, 'hello');
                this.is.same(COFY.read('"he\\\\\\"llo"').head, 'he\\"llo');
                this.is.same(COFY.read('hello').head.name, 'hello');
                this.is.same(COFY.read('a/b').head.parts[0], 'a');
                this.is.same(COFY.read('a/b').head.parts[1], 'b');
                this.is.same(COFY.read('a/b/c').head.name, 'a/b/c');
                this.is.same(COFY.read('a/b/c').head.parts[2], 'c');
                this.is.same(COFY.read('a/1').head.name, 'a/1');
                this.is.same(COFY.read('a/1').head.parts[1], 1);
                this.is.same(COFY.read('/').head.name, '/');
                this.is.same(COFY.read('/a').head.name, '/a');
                this.is.same(COFY.read('a/').head.name, 'a/');
                this.is.same(COFY.read('a//b').head.name, 'a//b');
            },

            lists: function () {
                this.is.same(COFY.read('()').head, null);
                this.is.same(COFY.read("'()").head.head.name, 'quote');
                this.is.same(COFY.read("'()").head.tail.head, null);
                this.is.same(COFY.read("'()").head.tail.tail, null);
                this.is.same(COFY.read('(1)').head.head, 1);
                this.is.same(COFY.read('(1)').head.tail, null);
                this.is.same(COFY.read('((1) 2)').head.head.head, 1);
                this.is.same(COFY.read('((1) 2)').head.tail.head, 2);
                this.is.same(COFY.read('((1) 2)').head.tail.tail, null);
                this.is.same(COFY.read('(1 : 2)').head.head, 1);
                this.is.same(COFY.read('(1 : 2)').head.tail, 2);
                this.is.same(COFY.read('(1 2 : 3)').head.tail.head, 2);
                this.is.same(COFY.read('(1 2 : 3)').head.tail.tail, 3);
            },

            multiple: function () {
                this.is.same(COFY.read('0 1').head, 0);
                this.is.same(COFY.read('0 1').tail.head, 1);
                this.is.same(COFY.read('0 1').tail.tail, null);
            },

            comments: function () {
                this.is.same(COFY.read('0 ; c').head, 0);
                this.is.same(COFY.read('0 ; c').tail, null);
                this.is.same(COFY.read(';c c\r\n1').head, 1);
                this.is.same(COFY.read(';c c\r\n1').tail, null);
                this.is.same(COFY.read('0\r\n;;c c \r\n2').head, 0);
                this.is.same(COFY.read('0\r\n;;c c \r\n2').tail.head, 2);
                this.is.same(COFY.read('0\r\n;;c c \r\n2').tail.tail, null);
            }
        },

        eval: {

            constants: function () {
                this.is.same(COFY.read_eval('0'), 0);
                this.is.same(COFY.read_eval('"hello"'), 'hello');
                this.is.same(COFY.read_eval("'hello").name, 'hello');
                this.is.same(COFY.read_eval("'hello/world").parts[0], 'hello');
                this.is.same(COFY.read_eval("'hello/world").parts[1], 'world');
                this.is.null(COFY.read_eval('()'));
                this.is.null(COFY.read_eval("'()"));
                this.is.same(COFY.read_eval("'(1)").head, 1);
                this.is.null(COFY.read_eval("'(1)").tail);
                this.is.same(COFY.read_eval("'((1))").head.head, 1);
                this.is.same(COFY.read_eval('0 1'), 1);
                this.is.true(COFY.read_eval('true'));
                this.is.false(COFY.read_eval('false'));
                this.is.undefined(COFY.read_eval('nil'));
                this.is.true(COFY.read_eval('(nan? nan)'));
                this.is.false(COFY.read_eval('(nan? 0)'));
                this.is.false(COFY.read_eval('(nan? nil)'));
                this.is.same(COFY.read_eval("'hello"), COFY.read_eval("'hello"));
                this.is.true(COFY.read_eval("(= (list 1 2 3) '(1 2 3))"));
            },

            identity: function () {
                this.is.true(COFY.read_eval('(identical? 0 0)'));
                this.is.false(COFY.read_eval('(identical? 0 1)'));
                this.is.true(COFY.read_eval('(identical? "a" "a")'));
                this.is.false(COFY.read_eval('(identical? "a" "b")'));
                this.is.true(COFY.read_eval('(identical? "a" \'"a")'));
                this.is.true(COFY.read_eval("(identical? 'a 'a)"));
                this.is.false(COFY.read_eval("(identical? 'a 'b)"));
                this.is.true(COFY.read_eval("(identical? 'a/b 'a/b)"));
                this.is.true(COFY.read_eval("(identical? () '())"));
                this.is.false(COFY.read_eval("(identical? ())"));
                this.is.true(COFY.read_eval("(identical? nil)"));
                this.is.false(COFY.read_eval("(identical? nan nan)"));
            },

            equality: function () {
                this.is.true(COFY.read_eval('(= 0 0)'));
                this.is.false(COFY.read_eval('(= 0 1)'));
                this.is.true(COFY.read_eval('(= "a" "a")'));
                this.is.true(COFY.read_eval('(= "a" \'"a")'));
                this.is.false(COFY.read_eval('(= "a" "b")'));
                this.is.true(COFY.read_eval("(= 'a 'a)"));
                this.is.false(COFY.read_eval("(= 'a 'b)"));
                this.is.true(COFY.read_eval("(= 'a/b 'a/b)"));
                this.is.true(COFY.read_eval("(= () '())"));
                this.is.true(COFY.read_eval("(= '(()) '(()))"));
                this.is.false(COFY.read_eval("(= '(0 a) '(0 b))"));
                this.is.true(COFY.read_eval("(= '(0 (a)) '(0 (a)))"));
                this.is.true(COFY.read_eval("(= '(0 (a)) (take 2 (list 0 (take 1 '(a b)) 1)))"));
            },

            math: function () {
                this.is.same(COFY.read_eval('(+)'), 0);
                this.is.same(COFY.read_eval('(+ 1 2 3 4)'), 10);
                this.is.same(COFY.read_eval('(- 1 2)'), -1);
                this.is.same(COFY.read_eval('(*)'), 1);
                this.is.same(COFY.read_eval('(* 1 2 3 4)'), 24);
                this.is.same(COFY.read_eval('(/ 6 3)'), 2);
                this.is.same(COFY.read_eval('(/ 5 2)'), 2.5);
                this.is.same(COFY.read_eval('pi'), Math.PI);
                this.is.same(COFY.read_eval('e'), Math.E);
                this.is.same(COFY.read_eval('(abs 1)'), 1);
                this.is.same(COFY.read_eval('(abs -1)'), 1);
                this.is.same(COFY.read_eval('(min 2 1 3)'), 1);
                this.is.same(COFY.read_eval('(max 2 1 3)'), 3);
                this.is.not.same(COFY.read_eval('random'), Math.random);
                this.is.same(COFY.read_eval('(round 1.6)'), 2);
                this.is.same(COFY.read_eval('(floor 1.6)'), 1);
                this.is.same(COFY.read_eval('(ceil 1.4)'), 2);
                this.is.true(COFY.read_eval('(< 1 2 3)'));
                this.is.true(COFY.read_eval('(< 1)'));
                this.is.true(COFY.read_eval('(<)'));
                this.is.false(COFY.read_eval('(< 1 2 2)'));
                this.is.false(COFY.read_eval('(< 1 2 1)'));
                this.is.true(COFY.read_eval('(<= 1)'));
                this.is.true(COFY.read_eval('(<=)'));
                this.is.true(COFY.read_eval('(<= 1 2 3)'));
                this.is.true(COFY.read_eval('(<= 1 2 2)'));
                this.is.false(COFY.read_eval('(<= 1 2 1)'));
                this.is.true(COFY.read_eval('(> 3 2 1)'));
                this.is.true(COFY.read_eval('(> 1)'));
                this.is.true(COFY.read_eval('(>)'));
                this.is.false(COFY.read_eval('(> 2 2 1)'));
                this.is.false(COFY.read_eval('(> 1 2 1)'));
                this.is.true(COFY.read_eval('(>= 1)'));
                this.is.true(COFY.read_eval('(>=)'));
                this.is.true(COFY.read_eval('(>= 3 2 1)'));
                this.is.true(COFY.read_eval('(>= 2 2 1)'));
                this.is.false(COFY.read_eval('(>= 1 2 1)'));
            },

            math_security: function () {
                COFY.read_eval('(set! sin "call" 0)');
                this.is.not.same(Math.sin.call, 0);
            },

            definitions: function () {
                var cofy = COFY.create();
                this.is.undefined(cofy.read_eval('(def a 1)'));
                this.is.same(cofy.read_eval('(def aa 1 ab 2) (+ aa ab)'), 3);
                this.throws.error(function () { cofy.read_eval('(def a 2)'); });
                this.throws.error(function () { cofy.read_eval('((fn (a) (def a 2) a) a)'); });
                this.throws.error(function () { cofy.read_eval('((fn () (def a 2 a 3) a))'); });
                this.is.same(COFY.read_eval('(def a 2) a'), 2);
                this.is.same(cofy.read_eval('((fn (a) a) a)'), 1);
                this.is.same(cofy.read_eval('((fn () (def a 2) a))'), 2);
                this.is.same(cofy.read_eval('(((fn () (def a 3) (fn () a))))'), 3);
                this.is.same(cofy.read_eval('((fn () (def a 1 b 2) (+ a b)))'), 3);
                this.is.same(cofy.read_eval('a'), 1);
                this.is.same(cofy.read_eval('(def (af x) (+ x 10)) (af 1)'), 11);
            },

            special_forms: function () {
                this.throws.error(function () { COFY.read_eval('(def if 1) if'); });
                this.is.same(COFY.read_eval('((fn () (def if 1) if))'), 1);
            },

            args: function () {
                this.is.undefined(COFY.read_eval('((fn (arg) arg))'));
                this.is.same(COFY.read_eval('((fn (arg) arg) 1)'), 1);
                this.is.same(COFY.read_eval('((fn (arg) arg) 1 2)'), 1);
                this.is.undefined(COFY.read_eval('(((fn (arg) (fn (arg) arg)) 1))'));
                this.is.same(COFY.read_eval('(((fn (arg) (fn (arg) arg))) 1)'), 1);
                this.is.undefined(COFY.read_eval('((fn (arg) ((fn (arg) arg))) 1)'));
            },

            varargs: function () {
                this.is.null(COFY.read_eval('((fn arglist arglist))'));
                this.is.true(COFY.read_eval("(= ((fn arglist arglist) 1) '(1))"));
                this.is.true(COFY.read_eval("(= ((fn arglist arglist) 1 2) '(1 2))"));
                this.is.same(COFY.read_eval('((fn (arg : rest) arg) 1)'), 1);
                this.is.null(COFY.read_eval('((fn (arg : rest) rest) 1)'));
                this.is.same(COFY.read_eval('((fn (arg1 arg2 : rest) arg1) 1)'), 1);
                this.is.undefined(COFY.read_eval('((fn (arg1 arg2 : rest) arg2) 1)'));
                this.is.null(COFY.read_eval('((fn (arg1 arg2 : rest) rest) 1)'));
                this.is.true(COFY.read_eval("(= ((fn (arg : rest) rest) 1 2 3) '(2 3))"));
            },

            mutability: function () {
                this.is.false(COFY.read_eval('(= (var 1) (var 1))'));
                this.is.false(COFY.read_eval('(= (cons (var 1) 2) (cons (var 1) 2))'));
                this.is.same(COFY.read_eval('(deref (var 1))'), 1);
                this.is.same(COFY.read_eval('(swap! (var 1) 2)'), 1);
                this.is.undefined(COFY.read_eval('(set! (var 1) 2)'));
                this.is.true(COFY.read_eval("(= ((fn (a) (def b (swap! a 2)) (cons (deref a) b)) (var 1)) '(2 : 1))"));
                this.is.same(COFY.read_eval("((fn (a) (set! a 2) (deref a)) (var 1))"), 2);
            },

            apply: function () {
                this.is.true(COFY.read_eval("(= (apply (fn (arg : rest) rest) '(1 2 3)) '(2 3))"));
                this.is.true(COFY.read_eval("(= (apply (fn args args) '(1 2 3)) '(1 2 3))"));
                this.is.true(COFY.read_eval("(= (apply (fn args args) '(1 2 : 3)) '(1 2))"));
                this.is.null(COFY.read_eval('(apply (fn args args) ())'));
                this.is.null(COFY.read_eval('(apply (fn args args))'));
                this.throws.error(function () { COFY.read_eval('(apply)'); });
            },

            streams: {

                filter: function () {
                    this.is.true(COFY.read_eval("(= (filter (fn (a) true) ()) ())"));
                    this.is.true(COFY.read_eval("(= (filter (fn (a) false) ()) ())"));
                    this.is.true(COFY.read_eval("(= (filter (fn (a) true) '(1 2 3)) '(1 2 3))"));
                    this.is.true(COFY.read_eval("(= (filter (fn (a) false) '(1 2 3)) ())"));
                    this.is.true(COFY.read_eval("(= (filter (fn (a) ()) '(1 2 3)) ())"));
                    this.is.true(COFY.read_eval("(= (filter (fn (a) nil) '(1 2 3)) ())"));
                    this.is.true(COFY.read_eval("(= (filter (fn (a) (> a 1)) '(1 2 0 3)) '(2 3))"));
                    this.is.true(COFY.read_eval("(= (filter (fn (a) true) '(1 : 2)) '(1 : 2))"));
                    this.is.same(COFY.read_eval("(filter (fn (a) (> a 1)) '(1 : 2))"), 2);
                    this.is.same(COFY.read_eval("(filter (fn (a) (> a 1)) 2)"), 2);
                    this.is.null(COFY.read_eval("(filter (fn (a) (> a 1)) 1)"));
                    this.is.true(COFY.read_eval("(= (filter (fn (a) (> a 1)) '(2 : 1)) '(2))"));
                    this.is.true(COFY.read_eval("(= (take 3 (filter (fn (x) (= 0 (remainder x 3))) (iterate inc 1))) '(3 6 9))"));
                },

                map: function () {
                    this.is.null(COFY.read_eval("(map (fn (a) 1) ())"));
                    this.is.true(COFY.read_eval("(= (map (fn (a) a) '(1 2 3)) '(1 2 3))"));
                    this.is.true(COFY.read_eval("(= (map (fn (a) (+ a 10)) '(1 2 3)) '(11 12 13))"));
                    this.is.true(COFY.read_eval("(= (map (fn (a) (+ a 10)) '(1 2 : 3)) '(11 12 : 13))"));
                    this.is.same(COFY.read_eval("(map (fn (a) (+ a 10)) 1)"), 11);
                    this.is.true(COFY.read_eval("(lazy? (map (fn (a) (+ a 10)) '(1 2 3)))"));
                    this.is.false(COFY.read_eval("(realized? (map (fn (a) (+ a 10)) '(1 2 3)))"));
                    this.is.true(COFY.read_eval("(lazy? (map (fn (a) (+ a 10)) (iterate inc 1)))"));
                    this.is.false(COFY.read_eval("(realized? (map (fn (a) (+ a 10)) (iterate inc 1)))"));
                    this.is.true(COFY.read_eval("(= (take 4 (map (fn (a) (+ a 10)) (iterate inc 1))) '(11 12 13 14))"));
                },

                map_multiple_args: function () {
                    this.is.same(COFY.read_eval("(map (fn () 1))"), 1);
                    this.is.true(COFY.read_eval("(= (map (fn (a b) (+ a b)) '(1 2 3) '(5 6 7)) '(6 8 10))"));
                    this.is.true(COFY.read_eval("(= (map + '(1 2 3) '(5 6)) '(6 8))"));
                    this.is.true(COFY.read_eval("(= (map + '(1 2 : 3) '(5 6)) '(6 8))"));
                    this.is.true(COFY.read_eval("(= (map + '(1 2 : 3) '(5 6 : 7)) '(6 8 : 10))"));
                    this.is.true(COFY.read_eval("(= (map list 1 2 3) '(1 2 3))"));
                    this.is.true(COFY.read_eval("(= (map list 1 '(2) '((3))) '(1 (2) ((3))))"));
                    this.is.true(COFY.read_eval("(= (take 6 (map + (iterate inc 1) (repeat 0 10))) '(1 12 3 14 5 16))"));
                },

                reduce: function () {
                    this.is.undefined(COFY.read_eval("(reduce (fn x 10))"));
                    this.is.same(COFY.read_eval("(reduce (fn x 10) 5)"), 5);
                    this.is.same(COFY.read_eval("(reduce (fn x 10) 5 ())"), 5);
                    this.is.same(COFY.read_eval("(reduce + 10 '(1))"), 11);
                    this.is.same(COFY.read_eval("(reduce + 10 1)"), 11);
                    this.is.same(COFY.read_eval("(reduce + 10 '(1 2))"), 13);
                    this.is.same(COFY.read_eval("(reduce + 10 '(1 : 2))"), 13);
                    this.is.same(COFY.read_eval("(reduce + 1 (take 4 (iterate inc 1)))"), 11);
                },

                zip: function () {
                    this.is.null(COFY.read_eval("(zip)"));
                    this.is.null(COFY.read_eval("(zip ())"));
                    this.is.true(COFY.read_eval("(= (zip 1) '(1))"));
                    this.is.true(COFY.read_eval("(= (zip '(1)) '(1))"));
                    this.is.true(COFY.read_eval("(= (zip '(1 : 2)) '(1 2))"));
                    this.is.true(COFY.read_eval("(= (zip '(1 2)) '(1 2))"));
                    this.is.true(COFY.read_eval("(= (zip '(1 5 : 8) '(2 6) '(3 : 7) 4) '(1 2 3 4 5 6 7 8))"));
                    this.is.true(COFY.read_eval("(= (take 5 (zip (iterate inc 1) (iterate inc 10))) '(1 10 2 11 3))"));
                    this.is.true(COFY.read_eval("(= (take 6 (zip (iterate inc 1) '(10 11))) '(1 10 2 11 3 4))"));
                    this.is.true(COFY.read_eval("(= (take 6 (zip (iterate inc 1) '(10 : 11))) '(1 10 2 11 3 4))"));
                },

                lazy: function () {
                    var val = 0, cofy;
                    cofy = COFY.create({ 'do-stuff': function () { val += 1; return val; }});
                    cofy.read_eval('(def (cons-fn) (cons (do-stuff) (lazy cons-fn)))');
                    cofy.read_eval('(def stream (lazy cons-fn))');
                    this.is.same(val, 0);
                    this.is.same(cofy.read_eval('(head stream)'), 1);
                    this.is.same(cofy.read_eval('(head stream)'), 1);
                    this.is.same(val, 1);
                    this.is.true(cofy.read_eval('(lazy? (tail stream))'));
                    this.is.same(cofy.read_eval('(head stream)'), 1);
                    this.is.same(val, 1);
                    this.is.same(cofy.read_eval('(head (tail stream))'), 2);
                    this.is.same(val, 2);
                    this.is.same(cofy.read_eval('(head stream)'), 1);
                    this.is.true(cofy.read_eval('(realized? stream)'));
                    this.is.true(cofy.read_eval('(realized? (tail stream))'));
                    this.is.false(cofy.read_eval('(realized? (tail (tail stream)))'));
                    this.is.false(cofy.read_eval('(empty? (tail (tail stream)))'));
                    this.is.true(cofy.read_eval('(realized? (tail (tail stream)))'));
                    this.is.true(cofy.read_eval('(empty? (lazy (fn () ())))'));
                    this.is.false(cofy.read_eval('(empty? (lazy (fn () 0)))'));
                    this.is.false(cofy.read_eval("(empty? (lazy (fn () '(0))))"));
                    this.is.true(cofy.read_eval("(empty? (tail (lazy (fn () '(0)))))"));
                },

                repeat: function () {
                    this.is.true(COFY.read_eval('(lazy? (repeat 1))'));
                    this.is.false(COFY.read_eval('(realized? (repeat 1))'));
                    this.is.same(COFY.read_eval('(head (repeat 1))'), 1);
                    this.is.same(COFY.read_eval('(head (tail (repeat 1)))'), 1);
                    this.is.same(COFY.read_eval('(head (repeat 1 2))'), 1);
                    this.is.false(COFY.read_eval('(lazy? (tail (repeat 1 2)))'));
                    this.is.same(COFY.read_eval('(head (tail (repeat 1 2)))'), 2);
                    this.is.true(COFY.read_eval('(lazy? (tail (tail (repeat 1 2))))'));
                    this.is.same(COFY.read_eval('(head (tail (tail (repeat 1 2))))'), 1);
                },

                iterate: function () {
                    this.is.true(COFY.read_eval('(stream? (iterate inc 1))'));
                    this.is.true(COFY.read_eval('(lazy? (tail (iterate inc 1)))'));
                    this.is.false(COFY.read_eval('(realized? (tail (iterate inc 1)))'));
                    this.is.same(COFY.read_eval('(head (iterate inc 1))'), 1);
                    this.is.same(COFY.read_eval('(head (tail (iterate inc 1)))'), 2);
                    this.is.same(COFY.read_eval('(head (tail (tail (iterate inc 1))))'), 3);
                },

                take: function () {
                    this.is.true(COFY.read_eval('(lazy? (take 3 (iterate inc 1)))'));
                    this.is.false(COFY.read_eval('(realized? (take 3 (iterate inc 1)))'));
                    this.is.same(COFY.read_eval('(head (tail (tail (take 3 (iterate inc 1)))))'), 3);
                    this.is.true(COFY.read_eval('(empty? (tail (tail (tail (take 3 (iterate inc 1))))))'));
                    this.is.true(COFY.read_eval("(lazy? (take 3 '(1 2 3 4 5)))"));
                    this.is.true(COFY.read_eval("(= (take 3 '(1 2 3 4 5)) '(1 2 3))"));
                },

                skip: function () {
                    this.is.true(COFY.read_eval('(lazy? (skip 3 (iterate inc 1)))'));
                    this.is.false(COFY.read_eval('(realized? (skip 3 (iterate inc 1)))'));
                    this.is.same(COFY.read_eval('(head (skip 3 (iterate inc 1)))'), 4);
                    this.is.same(COFY.read_eval('(head (tail (skip 3 (iterate inc 1))))'), 5);
                    this.is.true(COFY.read_eval('(lazy? (tail (skip 3 (iterate inc 1))))'));
                    this.is.false(COFY.read_eval('(realized? (tail (skip 3 (iterate inc 1))))'));
                    this.is.true(COFY.read_eval('(empty? (skip (/ 1 0) (iterate inc 1)))'));
                    this.is.true(COFY.read_eval('(empty? (skip nil (iterate inc 1)))'));
                    this.is.true(COFY.read_eval("(lazy? (skip 3 '(1 2 3 4 5)))"));
                    this.is.true(COFY.read_eval("(= (skip 3 '(1 2 3 4 5)) '(4 5))"));
                }
            },

            interop: {

                functions: function () {
                    this.is.same(COFY.read_eval('(fn (a b) (+ a b))')(1, 2), 3);
                    this.is.same(COFY.read_eval('(fn (a) (fn (b) (+ a b)))')(1)(2), 3);
                    this.is.same(COFY.read_eval('(fn (f) (f 1 2))')(function (a, b) { return a + b; }), 3);
                    this.is.same(COFY.read_eval('(fn (f a b) (f a b))')(function (a, b) { return a + b; }, 1, 2), 3);
                    this.is.same(COFY.read_eval('(fn (f) (fn (a b) (f a b)))')(function (a, b) { return a + b; })(1, 2), 3);
                },

                objects: function () {
                    this.is.same(COFY.read_eval('(fn (o) ((. o \'f) (. o "a")))')({ f: function (a) { return a + 1; }, a: 1 }), 2);
                    this.is.same(COFY.read_eval("(fn (o) ((. o \'f) (. o 'a)))")({ f: function (a) { return a + 1; }, a: 1 }), 2);
                    this.is.same(COFY.read_eval('(fn (o) o/a/b)')({ a: { b: 1 } }), 1);
                    this.is.same(COFY.read_eval('(fn (o) (o/f o/a))')({ f: function (a) { return a + 1; }, a: 1 }), 2);
                },

                arrays: function () {
                    this.is.same(COFY.read_eval('(fn (a) ((. a 0) (. a 1)))')([function (a) { return a + 1; }, 1]), 2);
                    this.is.same(COFY.read_eval('(fn (o) o/1/b)')([ 0, { b: 1 } ]), 1);
                    this.is.same(COFY.read_eval('(fn (a) (a/0 a/1))')([function (a) { return a + 1; }, 1]), 2);
                },

                capabilities_path_access: function () {
                    this.is.same(COFY.create({ o: { a: { b: 1 } }, c: [2, 'x'] }).read_eval('(+ o/a/b c/0)'), 3);
                },

                object_modification: function () {
                    var obj1 = { field: 1 }, obj2 = COFY.read_eval("(fn (a) (set! a 'field 2) a)")(obj1);
                    this.is.same(obj1, obj2);
                    this.is.same(obj1.field, 2);
                },

                array_modification: function () {
                    var arr1 = [0, 1], arr2 = COFY.read_eval('(fn (a) (set! a 1 2) a)')(arr1);
                    this.is.same(arr1, arr2);
                    this.is.same(arr1[1], 2);
                },

                dom_access: function () {
                    var cofy = COFY.create({ document: document });
                    this.is.same(cofy.read_eval('(. (.call document "getElementById" "test-text") "innerHTML")'), 'Test text');
                    cofy.read_eval('(set! (.call document "getElementById" "test-text") "innerHTML" "aaa")');
                    this.is.same(cofy.read_eval('(. (.call document "getElementById" "test-text") "innerHTML")'), 'aaa');
                    cofy.read_eval('(set! (.call document "getElementById" "test-text") "innerHTML" "Test text")');
                    this.is.same(cofy.read_eval('(. (.apply document "getElementById" \'("test-text")) "innerHTML")'), 'Test text');
                },

                dom_access_compact: function () {
                    var cofy = COFY.create({ document: document });
                    this.is.same(cofy.read_eval('(. (document/getElementById "test-text") \'innerHTML)'), 'Test text');
                    cofy.read_eval('(set! (document/getElementById "test-text") \'innerHTML "aaa")');
                    this.is.same(cofy.read_eval('(. (document/getElementById "test-text") \'innerHTML)'), 'aaa');
                    cofy.read_eval('(set! (document/getElementById "test-text") \'innerHTML "Test text")');
                    this.is.same(cofy.read_eval('(. (.call document document/getElementById "test-text") \'innerHTML)'), 'Test text');
                    this.is.same(cofy.read_eval('(. (.apply document document/getElementById \'("test-text")) \'innerHTML)'), 'Test text');
                }
            },

            modules: {

                import_symbol: function () {
                    var cofy = COFY.create({ lib: { add1: function (a) { return a + 1; } } });
                    this.throws.error(function () { cofy.read_eval('(add1 1)'); });
                    this.is.same(cofy.read_eval('(lib/add1 1)'), 2);
                    cofy.read_eval('(use lib)');
                    this.is.same(cofy.read_eval('(add1 1)'), 2);
                },

                import_expr: function () {
                    var cofy = COFY.create({ lib: { sublib: { add1: function (a) { return a + 1; } } } });
                    this.is.same(cofy.read_eval('(lib/sublib/add1 1)'), 2);
                    cofy.read_eval('(def aaa lib/sublib)');
                    this.is.same(cofy.read_eval('(aaa/add1 1)'), 2);
                    cofy.read_eval('(use aaa)');
                    this.is.same(cofy.read_eval('(add1 1)'), 2);
                },

                import_collision: function () {
                    var cofy = COFY.create({ lib: { add1: function (a) { return a + 1; } } });
                    this.is.same(cofy.read_eval('(lib/add1 1)'), 2);
                    cofy.read_eval('(def add1 (fn (x) (+ 1 x)))');
                    this.throws.error(function () { cofy.read_eval('(use lib)'); });
                }
            },

            macros: function () {
                var cofy = COFY.create();
            }
        },

        print: {

            constants: function () {
                this.is.same(COFY.read_eval_print('0'), '0');
                this.is.same(COFY.read_eval_print('"hello"'), '"hello"');
                this.is.same(COFY.read_eval_print('"hel\r\\n\\"\\\\lo"'), '"hel\\r\\n\\"\\\\lo"');
                this.is.same(COFY.read_eval_print("'hello"), 'hello');
                this.is.same(COFY.read_eval_print("'hello/world"), 'hello/world');
                this.is.same(COFY.read_eval_print('()'), '()');
                this.is.same(COFY.read_eval_print("'()"), '()');
            },

            jsconstants: function () {
                this.is.same(COFY.read_eval_print('true'), 'true');
                this.is.same(COFY.read_eval_print('false'), 'false');
                this.is.same(COFY.read_eval_print('nil'), 'undefined');
            },

            lists: function () {
                this.is.same(COFY.read_eval_print("'(1)"), '(1)');
                this.is.same(COFY.read_eval_print("'(1 2)"), '(1 2)');
                this.is.same(COFY.read_eval_print("'((1))"), '((1))');
                this.is.same(COFY.read_eval_print('(cons 1 2)'), '(1 : 2)');
                this.is.same(COFY.read_eval_print("'(1 : 2)"), '(1 : 2)');
                this.is.same(COFY.read_eval_print('(cons 0 (cons 1 2))'), '(0 1 : 2)');
                this.is.same(COFY.read_eval_print("'(0 : (1 : 2))"), '(0 1 : 2)');
                this.is.same(COFY.read_eval_print("'((1 : 2) : 3)"), '((1 : 2) : 3)');
                this.is.same(COFY.read_eval_print("'(0 : (1 : ()))"), '(0 1)');
                this.is.same(COFY.read_eval_print("'(0 1 : ())"), '(0 1)');
            }
        }
    };
});
