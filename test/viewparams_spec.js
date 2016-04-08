/* global describe it */
var assert = require('assert')
var viewParams = require('../lib/view-params')

describe('The view-params module', function () {
  describe('.tools', function () {
    var tools = viewParams.tools

    it('.modulename("_GLOBAL") === "global"', function () {
      assert.equal(tools.modulename('_GLOBAL'), 'global')
    })

    it('.modulename("module:foo/bar") === "foo/bar"', function () {
      assert.equal(tools.modulename('module:foo/bar'), 'foo/bar')
    })

    it('.modulename("unknown Module schema") === "unknown Module schema"', function () {
      assert.equal(tools.modulename('unknown Module schema'), 'unknown Module schema')
    })

    it('.sortByName() works', function () {
      var sorted = tools.sortByName([{
        name: 'xas',
        a: 1
      }, {
        name: 'ab',
        a: 2
      }])
      assert.equal(sorted.length, 2)
      assert.equal(sorted[0].name, 'ab')
      assert.equal(sorted[0].a, 2)
      assert.equal(sorted[1].name, 'xas')
      assert.equal(sorted[1].a, 1)
    })

    it('.shortName("module:foo/bar~Bla") === "Bla"', function () {
      assert.equal(tools.shortName('module:foo/bar~Bla'), 'Bla')
    })

    it('.shortName("Bla") === "Bla"', function () {
      assert.equal(tools.shortName('Bla'), 'Bla')
    })
  })
})
