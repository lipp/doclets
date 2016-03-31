/* global describe it before */
var assert = require('assert')
var gather = require('../lib/gather')
var path = require('path')

var loadFixture = function (name) {
  var dir = path.join(__dirname, '../fixtures', name)
  return gather.gatherDocletsAndMeta(dir, true)
}

describe('The gather module', function () {
  this.timeout(5000)

  it('getFiles with invalid dir', function () {
    var files = gather.getFiles({dir: 'test/../../'}, './')
    assert.equal(files.length, 0)
  })

  it('getFiles with valid dir', function () {
    var files = gather.getFiles({dir: 'test'}, './')
    assert(files.length > 0)
  })

  it('getFiles with invalid files', function () {
    var files = gather.getFiles({files: ['test/../../*.js']}, './')
    assert.equal(files.length, 0)
  })

  it('getFiles with valid files', function () {
    var files = gather.getFiles({files: ['test/*.js']}, './')
    assert(files.length > 0)
  })

  it('getFiles with valid and invalid files', function () {
    var files = gather.getFiles({files: ['test/gather_spec.js', 'test/../../*.js']}, './')
    assert.equal(files.length, 1)
  })

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

  describe('glob fixture', function () {
    var data
    before(function () {
      data = loadFixture('glob')
    })

    it('loads all specified files', function () {
      assert.equal(data.doclets.length, 4)
      assert.equal(data.doclets[0].meta.filename, 'index.js')
      assert.equal(data.doclets[1].meta.filename, 'lib/a.js')
      assert.equal(data.doclets[2].meta.filename, 'lib/b.js')
      assert.equal(data.doclets[3].meta.filename, 'vendor/d.js')
    })
  })

  var failing = [
    {dir: 'missing_dir', message: ''},
    {dir: 'no_doclets_yml', message: ''},
    {dir: 'invalid_doclets_yml', message: ''}
  ]

  failing.forEach(function (fail) {
    describe(fail.dir + ' fixture', function () {
      var data
      before(function () {
        data = loadFixture(fail.dir)
      })

      it('does not contain .doclets', function () {
        assert(!data.doclets)
      })

      it('defines error', function () {
        assert(data.error)
      })
    })
  })
})
