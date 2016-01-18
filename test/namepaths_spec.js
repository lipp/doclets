/* globals describe it before */

var assert = require('assert')
var gather = require('../lib/gather')
var path = require('path')
var structure = require('../lib/structure')

var loadFixture = function (name) {
  var dir = path.join(__dirname, '../fixtures', name)
  return structure.buildHierarchy(gather.gatherDocletsAndMeta(dir), '', '')
}

describe('namespaces', function () {
  describe('amd style', function () {
    var modules

    before(function () {
      modules = loadFixture('amd')
    })

    it('modules["module:my/jacket"].kind() === "class"', function () {
      assert.equal(modules['module:my/jacket'].kind(), 'class')
    })

    it('modules["module:my/jacket2"].kind() === "class"', function () {
      assert.equal(modules['module:my/jacket2'].kind(), 'class')
    })
  })

/*  describe('commonjs style', function () {
    var doclets

    before(function () {
      doclets = loadFixture('commonjs')
    })

    it('cal', function () {
      console.dir(doclets)
    })
  }) */
})
