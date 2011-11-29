function Complex(x, y) {
    this.x = x;
    this.y = y;
}

Complex.prototype.add = function (c2) {
    return new Complex(this.x + c2.x, this.y + c2.y);
};

Complex.prototype.sub = function (c2) {
    return new Complex(this.x - c2.x, this.y - c2.y);
};

Complex.prototype.mul = function (c2) {
    var a = this.x;
    var b = this.y;
    var c = c2.x;
    var d = c2.y;

    return new Complex(a*c - b*d, b*c + a*d);
};

Complex.prototype.div = function (c2) {
    var a = this.x;
    var b = this.y;
    var c = c2.x;
    var d = c2.y;
    
	var r = (a*c + b*d) / (c*c + d*d);
	var i = (b*c - a*d) / (c*c + d*d);
    return new Complex(r, i);
};

Complex.prototype.abs = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Complex.prototype.pol = function () {
    var z = this.abs();
    var f = Math.atan2(this.y, this.x);
    return new Complex(z, f);
};

Complex.prototype.rec = function () {
    var z = Math.abs(this.x);
    var f = this.y;
    var a = z * Math.cos(f);
    var b = z * Math.sin(f);
    return new Complex(a, b);
};

Complex.prototype.pow = function (exp) {
    var b = this.pol();
    var r = b.x;
    var f = b.y;
    var c = exp.x;
    var d = exp.y;
    var z = Math.pow(r, c) * Math.exp(-d * f);
    var fi = d * Math.log(r) + c * f;
    var rpol = new Complex(z, fi);
    return rpol.rec();
}