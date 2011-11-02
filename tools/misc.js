
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
