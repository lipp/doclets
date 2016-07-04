
/**
 * Makes some foo
 * @param {Array<Point>} points An array of points on which to foo
 * @param {Object} [options]
 * @param {string} options.mode The mode of fooing
 * @param {module:foo/bar~Bla.bla} [bla] The real bla
 * @param {Object<string, number>|Array<number>} [magics] Magic numbers
 * @param {Array<(number|string)>} [stuff] Some more stuff
 * @return {Promise< Array<Point >>} The resulting food points as promise
 */
var foo = function(points) {
}

/**
 * Some nullables?
 * @param {!number} a This is nullable
 * @param {?string} b This is not nullable
 *
 */
var nullable = function(a,b) {
}

/**
 * Not supported by JSDoc yet. Declarations got shortened
 * to basic types without extended info.
 * @param {function(string,boolean):number} action
 * @param {function(this:Date):null} modDate
 * @param {{a: string, b: number}} Record
 */
var advanced = function(action, modDate, record) {
}
