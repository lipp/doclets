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
      sandbox.stub(repo.github(), 'authenticate').returns()
      sandbox.stub(repo.github().repos, 'getHooks')
        .withArgs({user: 'lipp', repo: 'bar', per_page: 100})
        .yields(null, [{config: {url: 'http://api.doclets.io/github/callback'}}])

      repo.getHook('lipp', 'bar', {foo: 1}, function (err, hook) {
        assert(!err)
        assert.equal(hook.config.url, 'http://api.doclets.io/github/callback')
        done()
      })
    })

    it('.getHook() wrong url', function (done) {
      sandbox.stub(repo.github(), 'authenticate').returns()
      sandbox.stub(repo.github().repos, 'getHooks')
        .withArgs({user: 'lipp', repo: 'bar', per_page: 100})
        .yields(null, [{config: {url: 'hrr'}}])

      repo.getHook('lipp', 'bar', {foo: 1}, function (err, hook) {
        assert(!err)
        assert(!hook)
        done()
      })
    })

    it('.getHook() wrong url', function (done) {
      sandbox.stub(repo.github(), 'authenticate').returns()
      sandbox.stub(repo.github().repos, 'getHooks')
        .withArgs({user: 'lipp', repo: 'bar', per_page: 100})
        .yields(null, [{config: {url: 'hrr'}}])

      sandbox.stub(repo.github().repos, 'createHook')
        .withArgs({
          user: 'lipp',
          repo: 'bar',
          name: 'web',
          activate: true,
          events: ['push', 'create'],
          config: {
            secret: '12345678',
            url: 'http://api.doclets.io/github/callback',
            'content_type': 'json'
          }
        }).yields(null, 123)

      repo.addHook('lipp', 'bar', {foo: 1}, function (err, hook) {
        assert(!err)
        assert.equal(hook, 123)
        done()
      })
    })

    it('.getUserRepos() ', function (done) {
      sandbox.stub(repo.github(), 'authenticate').returns()
      sandbox.stub(repo.github().repos, 'getFromUser')
        .withArgs({user: 'lipp', type: 'owner', per_page: 100})
        .yields(null, [1, 2])

      repo.getUserRepos('lipp', {foo: 1}, function (err, repos) {
        assert(!err)
        assert.deepEqual(repos, [1, 2])
        done()
      })
    })
  })
})
