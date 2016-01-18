/* globals define */
define('my/shirt', function () {
  /**
   * A module representing a shirt.
   * @exports my/shirt
   */
  var shirt = {
    /** The module's `color` property. */
    color: 'black',

    /** @constructor */
    Turtleneck: function (size) {
      /** The class' `size` property. */
      this.size = size
    }
  }

  return shirt
})
