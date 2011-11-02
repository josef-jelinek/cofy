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

if (!Array.prototype.map) {
  Array.prototype.map = function (f) {
    'use strict';
    var res = Array(this.length);
    for (var i = 0; i < this.length; i++)
      res[i] = f(this[i]);
    return res;
  };
}

