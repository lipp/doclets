/* globals describe it before */

var assert = require('assert')
var gather = require('../lib/gather')
var path = require('path')
var structure = require('../lib/structure')
var _ = require('underscore')

var loadFixture = function (name) {
  var dir = path.join(__dirname, '../fixtures', name)
  var doclets = gather.gatherDocletsAndMeta(dir)
  var tree = structure.tree(doclets.doclets)
  var myShirt = _.findWhere(tree, {longname: 'module:my/jacket'})
  console.log(myShirt)
  // console.log(structure.childs(myShirt.childs.Turtleneck))

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

  describe('commonjs style', function () {
    var modules

    before(function () {
      modules = loadFixture('commonjs')
    })

    it('modules["module:bookshelf"].kind() === "module"', function () {
      assert.equal(modules['module:bookshelf'].kind(), 'module')
    })

    it('modules["module:bookshelf"].classes.length === 1', function () {
      assert.equal(modules['module:bookshelf'].classes.length, 1)
    })

    it('modules["module:bookshelf"].classes[0].name === "Book"', function () {
      assert.equal(modules['module:bookshelf'].classes[0].name, 'Book')
    })

    it('modules["module:color/mixer"].kind() === "module"', function () {
      assert.equal(modules['module:color/mixer'].kind(), 'module')
    })

    it('modules["module:color/mixer"].functions.length === 2', function () {
      assert.equal(modules['module:color/mixer'].functions.length, 2)
    })

    it('modules["module:color/mixer"].functions[0].name === "blend"', function () {
      assert.equal(modules['module:color/mixer'].functions[0].name, 'blend')
    })

    it('modules["module:color/mixer"].functions[1].name === "darken"', function () {
      assert.equal(modules['module:color/mixer'].functions[1].name, 'darken')
    })

    it('modules["module:color/mixer2"].kind() === "function"', function () {
      assert.equal(modules['module:color/mixer2'].kind(), 'function')
    })

    it('modules["module:color/mixer2"].functions[0].name === "module:color/mixer2"', function () {
      assert.equal(modules['module:color/mixer2'].functions[0].name, 'module:color/mixer2')
    })

    it('modules["module:color/mixer3"].kind() === "class"', function () {
      assert.equal(modules['module:color/mixer3'].kind(), 'class')
    })

    it('modules["module:color/mixer3"].classes[0].name === "module:color/mixer3"', function () {
      assert.equal(modules['module:color/mixer3'].classes[0].name, 'module:color/mixer3')
    })

    it('modules["module:my/shirt2"].kind() === "module"', function () {
      assert.equal(modules['module:my/shirt2'].kind(), 'module')
    })

    it('modules["module:my/shirt2"].functions.length === 1', function () {
      assert.equal(modules['module:my/shirt2'].functions.length, 1)
    })

    it('modules["module:my/shirt2"].functions[0].name === "wash"', function () {
      assert.equal(modules['module:my/shirt2'].functions[0].name, 'wash')
    })

    it('modules["module:wotd"].kind() === "string"', function () {
      assert.equal(modules['module:wotd'].kind(), 'string')
    })
  })

  describe('module variants', function () {
    var modules

    before(function () {
      modules = loadFixture('modules')
    })

    it('modules are defined', function () {
      assert(modules['module:explicit/stuff'])
      assert(modules['module:auto'])
      assert(modules['module:sub/auto'])
      assert(modules['module:sub/sub/auto2'])
    })
  })

  describe('namespaces', function () {
    var modules

    before(function () {
      modules = loadFixture('namespaces')
    })

    it('modules._GLOBAL.namespaces.length === 1', function () {
      assert.equal(modules._GLOBAL.namespaces.length, 1)
    })

    it('modules._GLOBAL.namespaces[0].name === "stuff"', function () {
      assert.equal(modules._GLOBAL.namespaces[0].name, 'stuff')
    })
  })
})
