/* global describe it after beforeEach afterEach */
var assert = require('assert')
var repo = require('../lib/repo')
var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var sinon = require('sinon')

var gitDir = path.join(__dirname, 'here')

describe('The repo module', function () {
  this.slow(10000)
  this.timeout(20000)

  after(function () {
    fse.removeSync(gitDir)
  })

  it('checkout("http://github.com/lipp/doclets", "master", "./here")', function () {
    var dir = repo.checkout('http://github.com/lipp/doclets', 'master', gitDir)
    assert.ok(dir)
    assert.doesNotThrow(function () {
      fs.readFileSync(path.join(dir, 'README.md'))
    })
  })

  it('checkout("http://github.com/lipp/doclets", "master", "./here") twice', function () {
    var dir = repo.checkout('http://github.com/lipp/doclets', 'master', gitDir)
    assert.ok(dir)
    assert.doesNotThrow(function () {
      fs.readFileSync(path.join(dir, 'README.md'))
    })
  })

  it('checkout("http://github.com/lipp/doclets", "foobla", "./here") throws', function () {
    assert.throws(function () {
      repo.checkout('http://github.com/lipp/doclets', 'foobla', gitDir)
    })
  })

  describe('working with the node_github package', function () {
    var sandbox

    beforeEach(function () {
      sandbox = sinon.sandbox.create()
    })

    afterEach(function () {
      sandbox.restore()
    })

    it('.getHook()', function (done) {
      sinon.stub(repo.github(), 'authenticate').returns()
      sinon.stub(repo.github().repos, 'getHooks')
        .withArgs({user: 'lipp', repo: 'bar', per_page: 100})
        .yields(null, [{config: {url: 'http://api.doclets.io/github/callback'}}])

      repo.getHook('lipp', 'bar', {foo: 1}, function (err, hook) {
        assert(!err)
        assert.equal(hook.config.url, 'http://api.doclets.io/github/callback')
        done()
      })
    })
  })
})
