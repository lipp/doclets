/* global describe it after beforeEach afterEach before */
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
  it('execThrow returns stdout', function () {
    assert.equal(repo.execThrow('ls ' + __filename), __filename) // eslint-disable-line
  })

  it('execThrow respects options.cwd ', function () {
    assert.equal(repo.execThrow('pwd', {cwd: __dirname}), __dirname)
  })

  describe('checkout()', function () {
    this.slow(10000)
    this.timeout(60000) // due to "sometimes slow" github.com
    var dir
    var url = 'https://9400d95247127f3b893d60a2949343550744a7e3@github.com/lipp/acme-jsdoc-example'
    var readmePath

    before(function () {
      dir = repo.checkout(url, 'master', gitDir)
      readmePath = path.join(dir, 'README.md')
    })

    after(function () {
      fse.removeSync(gitDir)
    })

    it('README.md exists', function () {
      assert.doesNotThrow(function () {
        fs.readFileSync(readmePath)
      })
    })

    it('remote url is correct', function () {
      assert.equal(repo.execThrow('git config --get remote.origin.url', {cwd: dir}), url)
    })

    it('branch is correct', function () {
      assert.equal(repo.execThrow('git symbolic-ref --short HEAD', {cwd: dir}), 'master')
    })

    it('throws on invalid branch', function () {
      assert.throws(function () {
        repo.checkout(url, 'foobla', gitDir)
      })
    })

    describe('with dirty working copy', function () {
      var readmeContent

      before(function () {
        readmeContent = fs.readFileSync(readmePath).toString()
      })

      beforeEach(function () {
        fs.writeFileSync(path.join(dir, 'artifact.txt'), 'asd')
        fs.writeFileSync(readmePath, 'oops')
      })

      after(function () {
        try {
          fs.unlinkSync(path.join(dir, 'artifact.txt'))
        } catch (err) {}
      })

      it('checkout makes clean wc', function () {
        repo.execThrow('sleep 2')
        var dir2 = repo.checkout(url, 'master', gitDir)
        assert.equal(dir2, dir)
        assert.equal(fs.readFileSync(readmePath).toString(), readmeContent)
        assert.throws(function () {
          fs.readFileSync(path.join(dir, 'artifact.txt'))
        })
      })
    })

    describe('checking out another branch', function () {
      var dir2

      before(function () {
        repo.execThrow('sleep 2')
        dir2 = repo.checkout(url, 'add-to-doclets', gitDir)
      })

      it('dir is same', function () {
        assert.equal(dir2, dir)
      })

      it('branch is correct', function () {
        assert.equal(repo.execThrow('git symbolic-ref --short HEAD', {cwd: dir}), 'add-to-doclets')
      })

      it('branch content really has been checked out', function () {
        assert.equal(fs.readFileSync(path.join(dir, 'just-for-this-branch.txt')).toString(), 'hello\n')
      })
    })

    describe('when changing the url', function () {
      var url2 = 'https://github.com/lipp/acme-jsdoc-example'
      var dir2

      before(function () {
        repo.execThrow('sleep 2')
        dir2 = repo.checkout(url2, 'master', gitDir)
      })

      it('dir is same', function () {
        assert.equal(dir2, dir)
      })

      it('branch is correct', function () {
        assert.equal(repo.execThrow('git symbolic-ref --short HEAD', {cwd: dir}), 'master')
      })

      it('README.md exists', function () {
        assert.doesNotThrow(function () {
          fs.readFileSync(readmePath)
        })
      })

      it('changed remote url is correct', function () {
        assert.equal(repo.execThrow('git config --get remote.origin.url', {cwd: dir}), url2)
      })
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
        .withArgs({org: 'orga', per_page: 100, page: 0})
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

      var repoArray = []
      for (var i = 0; i < 100; ++i) {
        repoArray[i] = {
          permissions: {
            admin: true
          },
          full_name: 'xxx'
        }
      }

      sandbox.stub(repo.github().repos, 'getAll')
        .withArgs({per_page: 100, page: 0})
        .yields(null, repoArray)
        .withArgs({per_page: 100, page: 1})
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
        assert.equal(repos.length, 4)
        assert(_.findWhere(repos, {full_name: 'asd'}))
        assert(_.findWhere(repos, {full_name: 'ppp'}))
        assert(_.findWhere(repos, {full_name: 'ddd'}))
        assert(_.findWhere(repos, {full_name: 'xxx'}))
        done()
      })
    })
  })
})
