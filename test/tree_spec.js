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
  return tree
}

describe('tree', function () {
  describe('amd', function () {
    var modules

    before(function () {
      modules = loadFixture('amd')
    })

    describe('my/shirt', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:my/shirt'})
        assert(mod)
      })

      it('has color and Turutleneck childs', function () {
        assert.equal(_.keys(mod.childs).length, 2)
        assert.equal(mod.childs.color.__doclet.longname, 'module:my/shirt.color')
        assert.equal(mod.childs.Turtleneck.__doclet.longname, 'module:my/shirt.Turtleneck')
      })

      it('Turutleneck has size child', function () {
        var tChilds = structure.childs(mod.childs.Turtleneck)
        assert.equal(_.keys(tChilds).length, 1)
        assert.equal(tChilds.size.__doclet.longname, 'module:my/shirt.Turtleneck#size')
      })

      it('size has no childs', function () {
        var childs = structure.childs(mod.childs.size)
        assert.equal(_.keys(childs).length, 0)
      })
    })

    describe('my/shirt2', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:my/shirt2'})
        assert(mod)
      })

      it('has color, size and __self childs', function () {
        assert.equal(_.keys(mod.childs).length, 3)
        assert.equal(mod.childs.color.__doclet.longname, 'module:my/shirt2.color')
        assert.equal(mod.childs.size.__doclet.longname, 'module:my/shirt2.size')
        assert.equal(mod.childs.__self.__doclet.longname, 'module:my/shirt2')
      })

      it('child __self is of kind member', function () {
        assert.equal(mod.childs.__self.__doclet.kind, 'member')
        assert.equal(mod.childs.__self.__doclet.longname, 'module:my/shirt2')
      })
    })

    describe('my/jacket', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:my/jacket'})
        assert(mod)
      })

      it('has zip and __self childs', function () {
        assert.equal(_.keys(mod.childs).length, 2)
        assert.equal(mod.childs.zip.__doclet.longname, 'module:my/jacket#zip')
        assert.equal(mod.childs.__self.__doclet.longname, 'module:my/jacket')
      })

      it('child __self is of kind class', function () {
        assert.equal(mod.childs.__self.__doclet.kind, 'class')
        assert.equal(mod.childs.__self.__doclet.longname, 'module:my/jacket')
      })
    })

    describe('html/utils', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:html/utils'})
        assert(mod)
      })

      it('has getStyleProperty and isInHead childs', function () {
        assert.equal(_.keys(mod.childs).length, 2)
        assert.equal(mod.childs.getStyleProperty.__doclet.longname, 'module:html/utils.getStyleProperty')
        assert.equal(mod.childs.isInHead.__doclet.longname, 'module:html/utils.isInHead')
      })
    })

    describe('tag', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:tag'})
        assert(mod)
      })

      it('has Tag childs', function () {
        assert.equal(_.keys(mod.childs).length, 1)
        assert.equal(mod.childs.Tag.__doclet.longname, 'module:tag.Tag')
      })
    })
  })

  describe('commonjs', function () {
    var modules

    before(function () {
      modules = loadFixture('commonjs')
    })

    describe('color/mixer', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:color/mixer'})
        assert(mod)
      })

      it('has blend and darken childs', function () {
        assert.equal(_.keys(mod.childs).length, 2)
        assert.equal(mod.childs.blend.__doclet.longname, 'module:color/mixer.blend')
        assert.equal(mod.childs.darken.__doclet.longname, 'module:color/mixer.darken')
      })
    })

    describe('color/mixer2', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:color/mixer2'})
        assert(mod)
      })

      it('has __self childs of kind function', function () {
        assert.equal(_.keys(mod.childs).length, 1)
        assert.equal(mod.childs.__self.__doclet.longname, 'module:color/mixer2')
        assert.equal(mod.childs.__self.__doclet.kind, 'function')
      })
    })

    describe('color/mixer3', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:color/mixer3'})
        assert(mod)
      })

      it('has __self childs of kind class', function () {
        assert.equal(_.keys(mod.childs).length, 1)
        assert.equal(mod.childs.__self.__doclet.longname, 'module:color/mixer3')
        assert.equal(mod.childs.__self.__doclet.kind, 'class')
      })
    })

    describe('bookshelf', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:bookshelf'})
        assert(mod)
      })

      it('has Book childs of kind class', function () {
        assert.equal(_.keys(mod.childs).length, 1)
        assert.equal(mod.childs.Book.__doclet.longname, 'module:bookshelf.Book')
        assert.equal(mod.childs.Book.__doclet.kind, 'class')
      })
    })

    describe('my/shirt2', function () {
      var mod
      before(function () {
        mod = _.findWhere(modules, {longname: 'module:my/shirt2'})
        assert(mod)
      })

      it('has wash childs of kind function', function () {
        assert.equal(_.keys(mod.childs).length, 1)
        assert.equal(mod.childs.wash.__doclet.longname, 'module:my/shirt2.wash')
        assert.equal(mod.childs.wash.__doclet.kind, 'function')
      })
    })
  })

  describe('namespaces', function () {
    var modules

    before(function () {
      modules = loadFixture('namespaces')
    })

    describe('_GLOBAL', function () {
      var mod
      before(function () {
        mod = modules._GLOBAL
        assert(mod)
      })

      it('has stuff child of kind namespace', function () {
        assert.equal(_.keys(mod.childs).length, 1)
        assert.equal(mod.childs.stuff.__doclet.longname, 'stuff')
        assert.equal(mod.childs.stuff.__doclet.kind, 'namespace')
      })

      it('stuff has foo child of kind member', function () {
        var childs = structure.childs(mod.childs.stuff)
        assert.equal(_.keys(childs).length, 1)
        assert.equal(childs.foo.__doclet.longname, 'stuff.foo')
        assert.equal(childs.foo.__doclet.kind, 'member')
      })
    })
  })

  describe('events', function () {
    var modules

    before(function () {
      modules = loadFixture('events')
    })

    describe('_GLOBAL', function () {
      var mod
      before(function () {
        mod = modules._GLOBAL
        assert(mod)
      })

      it('has Hurl child with no __doclet', function () {
        assert.equal(_.keys(mod.childs).length, 1)
        assert(mod.childs.Hurl)
        assert(!mod.childs.Hurl.__doclet)
      })

      it('Hurl has child snowball of kind function and event:snowball of kind event', function () {
        var childs = structure.childs(mod.childs.Hurl)
        assert.equal(_.keys(childs).length, 2)
        assert.equal(childs['event:snowball'].__doclet.longname, 'Hurl#event:snowball')
        assert.equal(childs['event:snowball'].__doclet.kind, 'event')
        assert.equal(childs['snowball'].__doclet.longname, 'Hurl#snowball')
        assert.equal(childs['snowball'].__doclet.kind, 'function')
      })
    })
  })

  describe('enums', function () {
    var modules

    before(function () {
      modules = loadFixture('enums')
    })

    describe('_GLOBAL', function () {
      var mod
      before(function () {
        mod = modules._GLOBAL
        assert(mod)
      })

      it('has triState child', function () {
        assert.equal(_.keys(mod.childs).length, 1)
        assert(mod.childs.triState)
        assert(mod.childs.triState.__doclet.longname, 'triState')
        assert(mod.childs.triState.__doclet.kind, 'enum')
      })

      it('triState has enum childs', function () {
        var childs = structure.childs(mod.childs.triState)
        assert.equal(_.keys(childs).length, 3)
        assert.equal(childs.TRUE.__doclet.longname, 'triState.TRUE')
        assert.equal(childs.FALSE.__doclet.longname, 'triState.FALSE')
        assert.equal(childs.MAYBE.__doclet.longname, 'triState.MAYBE')
        assert.equal(childs.MAYBE.__doclet.kind, 'member')
      })
    })
  })
})
