/* globals define */

// one module
define('html/utils', function () {
  /**
   * Utility functions to ease working with DOM elements.
   * @exports html/utils
   */
  var utils = {
    /** Get the value of a property on an element. */
    getStyleProperty: function (element, propertyName) {}
  }

  /** Determine if an element is in the document head. */
  utils.isInHead = function (element) {}

  return utils
}
)

// another module
define('tag', function () {
  /** @exports tag */
  var tag = {
    /** @class */
    Tag: function (tagName) {
      // ...
    }
  }

  return tag
})
