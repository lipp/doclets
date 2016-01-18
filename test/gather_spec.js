/* global describe it before */
var assert = require('assert')
var gather = require('../lib/gather')
var path = require('path')

var loadFixture = function (name) {
  var dir = path.join(__dirname, '../fixtures', name)
  return gather.gatherDocletsAndMeta(dir)
}

describe('The gather module', function () {
  describe('minimal_1 fixture', function () {
    var data
    before(function () {
      data = loadFixture('minimal_1')
    })

    it('basic info is correct', function () {
      assert.equal(data.version, '1.0.0')
      assert.equal(data.type, 'jsdoc')
    })

    it('.articles[0] is correct', function () {
      var article = data.articles[0]
      assert.equal(data.articles.length, 1)
      assert.equal(article.title, 'About')
      assert.equal(article.markdown, '#hello\n')
    })

    it('.doclets are correct', function () {
      assert.equal(data.doclets.length, 1)
      assert.equal(data.doclets[0].name, 'foo')
    })

    it('.doclets filename is relative to dir', function () {
      assert.equal(data.doclets[0].meta.filename, 'index.js')
    })
  })

  describe('minimal_2 fixture', function () {
    var data
    before(function () {
      data = loadFixture('minimal_2')
    })

    it('.doclets filename is relative to dir', function () {
      assert.equal(data.doclets[0].meta.filename, 'lib/index.js')
    })

    it('.articles[0] is correct', function () {
      var article = data.articles[0]
      assert.equal(data.articles.length, 1)
      assert.equal(article.title, 'About')
      assert.equal(article.markdown, '#hello\n')
    })
  })
})
