/**
 * Creates bla
 * @class
 */
var ExplicitCtor = function () {}

/**
 * Creates foo
 */
var ImplicitCtor = function () {}

/**
 * If ctor not defined as ctor, one child makes it a ctor
 */
ImplicitCtor.prototype.bar = function () {}

/**
 * Creates foo
 */
var implicitCtor = function () {}

/**
 * If ctor not defined as ctor and NOT Uppercase, one child makes it NOT a ctor
 */
implicitCtor.prototype.bar = function () {}
