/* global describe it after beforeEach afterEach */
var assert = require('assert')
var repo = require('../lib/repo')
var env = require('../lib/env')
var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var sinon = require('sinon')
var _ = require('underscore')

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

    it('.getUser', function (done) {
      sandbox.stub(repo.github(), 'authenticate').withArgs('auth').returns()
      sandbox.stub(repo.github().user, 'get').withArgs({}).yields(null, 123)
      sandbox.stub(repo.github().user, 'getOrgs').withArgs({}).yields(null, 333)
      repo.getUser('auth', function (err, user, orgs) {
        assert(!err)
        assert.equal(user, 123)
        assert.equal(orgs, 333)
        done()
      })
    })

    it('.getUser propagates error', function (done) {
      sandbox.stub(repo.github(), 'authenticate').withArgs('auth').returns()
      sandbox.stub(repo.github().user, 'get').withArgs({}).yields(null, 123)
      sandbox.stub(repo.github().user, 'getOrgs').withArgs({}).yields('arg')
      repo.getUser('auth', function (err, user, orgs) {
        assert.equal(err, 'arg')
        assert(!user)
        assert(!orgs)
        done()
      })
    })

    it('.getOrg', function (done) {
      sandbox.stub(repo.github(), 'authenticate').withArgs('auth').returns()
      sandbox.stub(repo.github().orgs, 'get').withArgs({org: 'asd'}).yields(null, 123)
      repo.getOrg('asd', 'auth', function (err, org) {
        assert(!err)
        assert.equal(org, 123)
        done()
      })
    })

    it('.getOrg propagates error', function (done) {
      sandbox.stub(repo.github(), 'authenticate').withArgs('auth').returns()
      sandbox.stub(repo.github().orgs, 'get').withArgs({org: 'asd'}).yields('arg')
      repo.getOrg('asd', 'auth', function (err, org) {
        assert(!org)
        assert.equal(err, 'arg')
        done()
      })
    })

    it('.getRepoEvents', function (done) {
      sandbox.stub(repo.github(), 'authenticate').withArgs('auth').returns()
      sandbox.stub(repo.github().events, 'getFromRepo').withArgs({user: 'asd', repo: 'foo'}).yields(null, 333)
      repo.getRepoEvents('asd', 'foo', 'auth', function (err, events) {
        assert(!err)
        assert.equal(events, 333)
        done()
      })
    })

    it('.hasUserAccess yes', function (done) {
      sandbox.stub(repo.github(), 'authenticate').withArgs('auth').returns()
      sandbox.stub(repo.github().repos, 'get').withArgs({user: 'asd', repo: 'foo'}).yields(null, {permissions: {admin: true}})
      repo.hasUserAccess('asd', 'foo', 'auth', function (err, hasAccess) {
        assert(!err)
        assert.equal(hasAccess, true)
        done()
      })
    })

    it('.hasUserAccess no', function (done) {
      sandbox.stub(repo.github(), 'authenticate').withArgs('auth').returns()
      sandbox.stub(repo.github().repos, 'get').withArgs({user: 'asd', repo: 'foo'}).yields(null, {permissions: {admin: false}})
      repo.hasUserAccess('asd', 'foo', 'auth', function (err, hasAccess) {
        assert(!err)
        assert.equal(hasAccess, false)
        done()
      })
    })

    it('.hasUserAccess err', function (done) {
      sandbox.stub(repo.github(), 'authenticate').withArgs('auth').returns()
      sandbox.stub(repo.github().repos, 'get').withArgs({user: 'asd', repo: 'foo'}).yields('arg')
      repo.hasUserAccess('asd', 'foo', 'auth', function (err, hasAccess) {
        assert(!hasAccess)
        assert.equal(err, 'arg')
        done()
      })
    })

    it('.getAuthScopes()', function (done) {
      var header = {}
      header['x-oauth-scopes'] = 'asd, foo'
      sandbox.stub(repo.github(), 'authenticate').withArgs('noauth').returns()
      sandbox.stub(repo.github().misc, 'rateLimit').withArgs({}).yields(null, {meta: header})
      repo.getAuthScopes('noauth', function (err, scopes) {
        assert(!err)
        assert.equal(scopes.length, 2)
        assert(scopes.indexOf('asd') > -1)
        assert(scopes.indexOf('foo') > -1)
        done()
      })
    })

    it('.getAuthScopes() err', function (done) {
      var header = {}
      header['x-oauth-scopes'] = 'asd, foo'
      sandbox.stub(repo.github(), 'authenticate').withArgs('noauth').returns()
      sandbox.stub(repo.github().misc, 'rateLimit').withArgs({}).yields('arg')
      repo.getAuthScopes('noauth', function (err, scopes) {
        assert(!scopes)
        assert.equal(err, 'arg')
        done()
      })
    })

    it('.getHook()', function (done) {
      sandbox.stub(repo.github(), 'authenticate').returns()
      sandbox.stub(repo.github().repos, 'getHooks')
        .withArgs({user: 'lipp', repo: 'bar', per_page: 100})
        .yields(null, [{config: {url: 'https://ci.doclets.io/github/callback'}}])

      repo.getHook('lipp', 'bar', {foo: 1}, function (err, hook) {
        assert(!err)
        assert.equal(hook.config.url, 'https://ci.doclets.io/github/callback')
        done()
      })
    })

    it('.getHook() wrong url', function (done) {
      sandbox.stub(repo.github(), 'authenticate')
        .withArgs({foo: 1})
        .returns()
      sandbox.stub(repo.github().repos, 'getHooks')
        .withArgs({user: 'lipp', repo: 'bar', per_page: 100})
        .yields(null, [{config: {url: 'hrr'}}])

      repo.getHook('lipp', 'bar', {foo: 1}, function (err, hook) {
        assert(!err)
        assert(!hook)
        done()
      })
    })

    it('.addHook() creating new hook', function (done) {
      sandbox.stub(repo.github(), 'authenticate')
        .withArgs({foo: 1})
        .returns()
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
            secret: env.api.secret,
            url: 'https://ci.doclets.io/github/callback',
            'content_type': 'json'
          }
        }).yields(null, 123)

      repo.addHook('lipp', 'bar', {foo: 1}, function (err, hook) {
        assert(!err)
        assert.equal(hook, 123)
        done()
      })
    })

    it('.addHook() updating existing hook', function (done) {
      var hook = {
        config: {
          url: 'https://ci.doclets.io/github/callback'
        },
        id: 123
      }
      sandbox.stub(repo.github(), 'authenticate')
        .withArgs({foo: 1})
        .returns()
      sandbox.stub(repo.github().repos, 'getHooks')
        .withArgs({user: 'lipp', repo: 'bar', per_page: 100})
        .yields(null, [hook])

      sandbox.stub(repo.github().repos, 'updateHook')
        .withArgs({
          user: 'lipp',
          repo: 'bar',
          name: 'web',
          active: true,
          id: hook.id,
          config: {
            secret: env.api.secret,
            url: 'https://ci.doclets.io/github/callback',
            'content_type': 'json'
          }
        }).yields(null, 123)

      repo.addHook('lipp', 'bar', {foo: 1}, function (err, hook) {
        assert(!err)
        assert.equal(hook, 123)
        done()
      })
    })

    it('.addHook() forwards getHook error', function (done) {
      sandbox.stub(repo.github(), 'authenticate')
        .withArgs({foo: 1})
        .returns()
      sandbox.stub(repo.github().repos, 'getHooks')
        .withArgs({user: 'lipp', repo: 'bar', per_page: 100})
        .yields('some error')

      repo.addHook('lipp', 'bar', {foo: 1}, function (err, hook) {
        assert.equal(err, 'some error')
        assert(!hook)
        done()
      })
    })

    it('.removeHook() an existing hook', function (done) {
      var hook = {
        config: {
          url: 'https://ci.doclets.io/github/callback'
        },
        id: 123
      }
      sandbox.stub(repo.github(), 'authenticate')
        .withArgs({foo: 1})
        .returns()

      sandbox.stub(repo.github().repos, 'updateHook')
        .withArgs({
          user: 'lipp',
          repo: 'bar',
          name: 'web',
          active: false,
          id: hook.id,
          config: {
            secret: env.api.secret,
            url: 'https://ci.doclets.io/github/callback',
            'content_type': 'json'
          }
        }).yields(null, 123)

      repo.removeHook('lipp', 'bar', {foo: 1}, hook, function (err, hook) {
        assert(!err)
        assert.equal(hook, 123)
        done()
      })
    })

    it('.getUserRepos() ', function (done) {
      sandbox.stub(repo.github(), 'authenticate').withArgs('auth').returns()
      sandbox.stub(repo.github().user, 'getOrgs')
        .withArgs({})
        .yields(null, [{login: 'orga'}])

      sandbox.stub(repo.github().repos, 'getFromOrg')
        .withArgs({org: 'orga', per_page: 100})
        .yields(null, [{
          permissions: {
            admin: true
          },
          full_name: 'asd'
        }, {
          permissions: {
            admin: true
          },
          full_name: 'ppp'
        }])

      sandbox.stub(repo.github().repos, 'getAll')
        .withArgs({per_page: 100})
        .yields(null, [{
          permissions: {
            admin: true
          },
          full_name: 'ddd'
        }, {
          permissions: {
            admin: true
          },
          full_name: 'asd'
        }])

      repo.getUserRepos('lipp', {foo: 1}, function (err, repos) {
        assert(!err)
        assert.equal(repos.length, 3)
        assert(_.findWhere(repos, {full_name: 'asd'}))
        assert(_.findWhere(repos, {full_name: 'ppp'}))
        assert(_.findWhere(repos, {full_name: 'ddd'}))
        done()
      })
    })
  })
})
