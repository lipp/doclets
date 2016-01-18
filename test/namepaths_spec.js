/* globals describe it before */

var assert = require('assert')
var gather = require('../lib/gather')
var path = require('path')
var structure = require('../lib/structure')

var loadFixture = function (name) {
  var dir = path.join(__dirname, '../fixtures', name)
  var doclets = gather.gatherDocletsAndMeta(dir)
  return structure.buildHierarchy(doclets, '', '')
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

    it('modules["module:my/jacket"].classes.length === 1', function () {
      assert.equal(modules['module:my/jacket'].classes.length, 1)
    })

    it('modules["module:my/jacket"].classes[0].name === "module:my/jacket"', function () {
      assert.equal(modules['module:my/jacket'].classes[0].name, 'module:my/jacket')
    })

    it('modules["module:my/shirt"].kind() === "module"', function () {
      assert.equal(modules['module:my/shirt'].kind(), 'module')
    })

    it('modules["module:my/shirt2"].kind() === "module"', function () {
      assert.equal(modules['module:my/shirt2'].kind(), 'module')
    })

    it('modules["module:my/shirt2"].members.length === 2', function () {
      assert.equal(modules['module:my/shirt2'].members.length, 2)
    })

    it('modules["module:my/shirt2"].members[0].name === "color"', function () {
      assert.equal(modules['module:my/shirt2'].members[0].name, 'color')
    })

    it('modules["module:my/shirt2"].members[1].name === "size"', function () {
      assert.equal(modules['module:my/shirt2'].members[1].name, 'size')
    })

    it('modules["module:html/utils"].kind() === "module"', function () {
      assert.equal(modules['module:html/utils'].kind(), 'module')
    })

    it('modules["module:html/utils"].functions.length === 2', function () {
      assert.equal(modules['module:html/utils'].functions.length, 2)
    })

    it('modules["module:html/utils"].functions[0].name === "getStyleProperty"', function () {
      assert.equal(modules['module:html/utils'].functions[0].name, 'getStyleProperty')
    })

    it('modules["module:html/utils"].functions[1].name === "isInHead"', function () {
      assert.equal(modules['module:html/utils'].functions[1].name, 'isInHead')
    })

    it('modules["module:tag"].kind() === "module"', function () {
      assert.equal(modules['module:tag'].kind(), 'module')
    })

    it('modules["module:tag"].classes.length === 1', function () {
      assert.equal(modules['module:tag'].classes.length, 1)
    })

    it('modules["module:tag"].classes[0].name === "Tag"', function () {
      assert.equal(modules['module:tag'].classes[0].name, 'Tag')
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
