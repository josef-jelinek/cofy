var object = Object.create || function (o) {
  'use strict';
  function F() {}
  F.prototype = o;
  return new F();
};

var trim = String.trim || function (s) {
  'use strict';
  return s.replace(/^\s+|\s+$/g, '');
};

// Y combinator
function y(g) {
  'use strict';
  return (function (f) {
    return f(f);
  }(function (f) {
    return g(function (x) {
      return f(f)(x);
    });
  }));
}
