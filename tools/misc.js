// Y combinator
function y(g) {
  'use strict';
  return function (f) {
    return f(f);
  }(function (f) {
    return g(function (x) {
      return f(f)(x);
    });
  });
}


// a standard way to define a named recursive function to compute factorial and immediately invoking it
(function fac(n) {
  return n === 0 ? 1 : fac(n - 1) * n;
}(3)); // 6

// what we want to do is the ability to use recursion without the ability to name the function before it is fully defined, e.g.

(function (n) {
  return y(function (f, n) {
    return n === 0 ? 1 : f(n - 1) * n;
  };
}(3));

// there is another form that may be preferable using a function taking the recursive function as its parameter to transform without knowing about the parameter needed for the computation

//so we want something like this:

(function (n) {
  return y(function (f) {
    return function (n) {
      return n === 0 ? 1 : f(n - 1) * n;
    };
  };
}(3));

// thus

var fac = y(function (f) {
  return function (n) {
    return n === 0 ? 1 : f(n - 1) * n;
  };
};

// now let's solve for 'y'

// to define an unnamed recursive function we need to get itself as a parameter that serves as naming the function to call
// however, since there is no way to pass itself directly without having a name, we use a little trick of passing another function doing the same thing
// removing self-reference by passing the copy of the function to itself as a parameter
(function (f, n) {
  return n === 0 ? 1 : f(f, n - 1) * n;
}(function (f, n) {
  return n === 0 ? 1 : f(f, n - 1) * n;
}, 3)); // 6

// separating parameters by making nested function f(a, b) -> f(a)(b) (currying)
// this allows us to call the resulting function with the number parameter
(function (f) {
  return function (n) {
    return n === 0 ? 1 : f(f)(n - 1) * n;
  };
}(function (f) {
  return function (n) {
    return n === 0 ? 1 : f(f)(n - 1) * n;
  };
})(3)); // 6

// factoring out the duplicate code in the inner function - the most tricky part to comprehend
// the easiest is to look at that backwards and substitute the body by the parameter
// if you call the parameter with itself it gives back a function taking 'n' which we want to return
(function (f) {
  return f(f);
}(function (f) {
  return function (n) {
    return n === 0 ? 1 : f(f)(n - 1) * n;
  };
})(3)); // 6

// extracting the function that computes the factorial to a function passed as a parameter
// the extracted function gets passed reference to a function to call for the next recursive step and the original argument
(function (g) {
  return function (f) {
    return f(f);
  }(function (f) {
    return function (n) {
      return g(f(f), n);
    };
  });
}(function (f, n) {
  return n === 0 ? 1 : f(n - 1) * n;
})(3)); // 6

// separating parameters as done before so we can pass them one by one
(function (g) {
  return function (f) {
    return f(f);
  }(function (f) {
    return function (n) {
      return g(f(f))(n);
    };
  });
}(function (f) {
  return function (n) {
    return n === 0 ? 1 : f(n - 1) * n;
  };
})(3)); // 6

// extracting the call one level up
(function (g) {
  return function (f) {
    return f(f);
  }(function (f) {
    return g(function (n) {
      return f(f)(n);
    });
  });
}(function (f) {
  return function (n) {
    return n === 0 ? 1 : f(n - 1) * n;
  };
})(3)); // 6

// separating and naming the resulting function and its particular use for computing factorial
var y = function (g) {
  return function (f) {
    return f(f);
  }(function (f) {
    return g(function (n) {
      return f(f)(n);
    });
  });
};

var fac = y(function (f) {
  return function (n) {
    return n === 0 ? 1 : f(n - 1) * n;
  };
});

fac(3); // 6
