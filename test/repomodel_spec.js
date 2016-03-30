/* global describe it before beforeEach after afterEach */
var assert = require('assert')
var Repo = require('../lib/models/repo')
var User = require('../lib/models/user')
var repoModule = require('../lib/repo')
var env = require('../lib/env')
var path = require('path')
var fs = require('fs')
var mongoose = require('mongoose')
var sinon = require('sinon')
var async = require('async')
var _ = require('underscore')

var repoData = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures', 'repos.json'))).slice(0, 4)

describe('The repo model module', function () {
  var sandbox

  before(function (done) {
    mongoose.connect('mongodb://' + env.mongodb.host)
    User.remove({}, done)
  })

  after(function (done) {
    mongoose.connection.close()
    mongoose.connection.once('close', done)
  })

  beforeEach(function (done) {
    sandbox = sinon.sandbox.create()

    Repo.remove({}, done)
  })

  afterEach(function (done) {
    sandbox.restore()
    Repo.remove({}, done)
  })

  describe('statics', function () {
    it('.createFromGitHub succeeds', function (done) {
      sandbox.stub(repoModule, 'getHook').withArgs('lipp', 'acme-jsdoc-example', 'noauth').yields(null, 123)
      Repo.createFromGitHub(repoData[0], 'noauth', function (err, repo) {
        assert(!err)
        assert.equal(repo.githubId, repoData[0].id)
        assert.equal(repo._id, repoData[0].full_name)
        assert.equal(repo.owner, repoData[0].owner.login)
        assert.equal(repo._owner, repoData[0].owner.login)
        assert.equal(repo.name, repoData[0].name)
        assert.equal(repo.url, repoData[0].html_url)
        assert.equal(repo.webhook, 123)
        done()
      })
    })

    it('.createFromGitHub propagates error', function (done) {
      sandbox.stub(repoModule, 'getHook').withArgs('lipp', 'acme-jsdoc-example', 'noauth').yields('arg')
      Repo.createFromGitHub(repoData[0], 'noauth', function (err, repo) {
        assert.equal(err, 'arg')
        assert(!repo)
        done()
      })
    })

    it('.createFromGitHub twice fails', function (done) {
      sandbox.stub(repoModule, 'getHook').withArgs('lipp', 'acme-jsdoc-example', 'noauth').yields(null, 123)
      Repo.createFromGitHub(repoData[0], 'noauth', function (err, repo) {
        assert(!err)
        assert(repo)
        Repo.createFromGitHub(repoData[0], 'noauth', function (err, repo) {
          assert(err)
          assert(!repo)
          done()
        })
      })
    })

    it('.sync() calls repoModule.getUserRepos and calls Repo.syncOrCreate for each repo', function (done) {
      var fakeGhRepos = [
        {full_name: 'foo/bar'},
        {full_name: 'asd/pop'}
      ]
      var syncOrCreate = sandbox.stub(Repo, 'syncOrCreate')
      syncOrCreate.withArgs(fakeGhRepos[0], 'noauth').yields()
      syncOrCreate.withArgs(fakeGhRepos[1], 'noauth').yields()
      sandbox.stub(repoModule, 'getUserRepos').withArgs('lipp', 'noauth').yields(null, fakeGhRepos)
      Repo.sync('lipp', 'noauth', function (err, repos) {
        assert(!err)
        assert.equal(repos.length, 2)
        assert(repos.indexOf('foo/bar') > -1)
        assert(repos.indexOf('asd/pop') > -1)
        done()
      })
    })

    it('.sync() propagates repo.syncOrCreate error', function (done) {
      var fakeGhRepos = [
        {full_name: 'foo/bar'},
        {full_name: 'asd/pop'}
      ]
      var syncOrCreate = sandbox.stub(Repo, 'syncOrCreate')
      syncOrCreate.withArgs(fakeGhRepos[0], 'noauth').yields()
      syncOrCreate.withArgs(fakeGhRepos[1], 'noauth').yields('arg')
      sandbox.stub(repoModule, 'getUserRepos').withArgs('lipp', 'noauth').yields(null, fakeGhRepos)
      Repo.sync('lipp', 'noauth', function (err, repos) {
        assert.equal(err, 'arg')
        assert(!repos)
        done()
      })
    })

    it('.sync() propagates repoModule.getUserRepos error', function (done) {
      sandbox.stub(repoModule, 'getUserRepos').withArgs('lipp', 'noauth').yields('arg')
      Repo.sync('lipp', 'noauth', function (err, repos) {
        assert.equal(err, 'arg')
        assert(!repos)
        done()
      })
    })

    it('.syncOrCreate once creates repo', function (done) {
      sandbox.stub(Repo, 'createFromGitHub').withArgs(repoData[0], 'noauth').yields(null, 123)
      Repo.syncOrCreate(repoData[0], 'noauth', function (err, repo) {
        assert(!err)
        assert.equal(repo, 123)
        done()
      })
    })

    it('.syncOrCreate syncs/updates repo', function (done) {
      sandbox.stub(repoModule, 'getHook').withArgs('lipp', 'acme-jsdoc-example', 'noauth').yields(null, 123)
      Repo.syncOrCreate(repoData[0], 'noauth', function (err, repo) {
        assert(!err)
        assert(repo)
        repoData[0].stargazers_count++
        Repo.syncOrCreate(repoData[0], 'noauth', function (err, repo) {
          assert(!err)
          assert.equal(repo.stars, repoData[0].stargazers_count)
          done()
        })
      })
    })

    it('.changeOwnner propagates db error', function (done) {
      sandbox.stub(Repo, 'find').withArgs({owner: 'horst'}).yields('arg')
      Repo.changeOwner('horst', 'lipp', function (err) {
        assert.equal(err, 'arg')
        done()
      })
    })

    it('.changeOwner', function (done) {
      var repo1 = new Repo()
      repo1.owner = 'asd'
      repo1._id = 'asd/foo'
      repo1.name = 'foo'
      repo1.webhook = {active: true}
      var repo2 = new Repo()
      repo2.owner = 'asd'
      repo2._id = 'asd/foo2'
      repo2.name = 'foo2'
      var repo3 = new Repo()
      repo3.owner = 'bar'
      repo3._id = 'bar/foo2'
      repo3.name = 'foo2'
      async.parallel([
        repo1.save.bind(repo1),
        repo2.save.bind(repo2),
        repo3.save.bind(repo3)
      ], function (err) {
        assert(!err, err)
        Repo.changeOwner('asd', 'proto', function (err) {
          assert(!err, err)
          Repo.find({}, function (err, repos) {
            assert(!err, err)
            assert.equal(repos.length, 3)
            var newRepo1 = _.findWhere(repos, {_id: 'proto/foo'})
            assert(newRepo1)
            assert.equal(newRepo1.owner, 'proto')
            assert.equal(newRepo1._owner, 'proto')
            assert.equal(newRepo1.name, 'foo')
            assert.deepEqual(newRepo1.webhook, repo1.webhook)
            assert(_.findWhere(repos, {_id: 'proto/foo2'}))
            assert(_.findWhere(repos, {_id: 'bar/foo2'}))
            done()
          })
        })
      })
    })
  })

  describe('methods', function () {
    var repo
    var getHook
    beforeEach(function (done) {
      getHook = sandbox.stub(repoModule, 'getHook')
      getHook.withArgs('lipp', 'acme-jsdoc-example', 'noauth').yields(null, 123)
      Repo.createFromGitHub(repoData[0], 'noauth', function (err, repo_) {
        repo = repo_
        done(err)
      })
    })

    it('changeWebHook', function (done) {
      sandbox.stub(repoModule, 'addHook').withArgs('lipp', 'acme-jsdoc-example', 'noauth').yields(null, 333)
      repo.changeWebHook(true, 'noauth', function (err, repo) {
        assert(!err)
        assert.equal(repo.webhook, 333)
        done()
      })
    })

    it('changeWebHook', function (done) {
      sandbox.stub(repoModule, 'removeHook').withArgs('lipp', 'acme-jsdoc-example', 'noauth').yields(null, 222)
      repo.changeWebHook(false, 'noauth', function (err, repo) {
        assert(!err)
        assert.equal(repo.webhook, 222)
        done()
      })
    })

    it('enableWebHook', function (done) {
      sandbox.stub(repo, 'changeWebHook').withArgs(true, 'noauth').yields(null, repo)
      repo.enableWebHook('noauth', function (err, repo_) {
        assert(!err)
        assert.equal(repo, repo_)
        done()
      })
    })

    it('disableWebHook', function (done) {
      sandbox.stub(repo, 'changeWebHook').withArgs(false, 'noauth').yields(null, repo)
      repo.disableWebHook('noauth', function (err, repo_) {
        assert(!err)
        assert.equal(repo, repo_)
        done()
      })
    })

    it('isWebHookEnabled', function () {
      repo.webhook = false
      assert.equal(repo.isWebHookEnabled(), false)
    })

    it('isWebHookEnabled', function () {
      repo.webhook = {active: false}
      assert.equal(repo.isWebHookEnabled(), false)
    })

    it('isWebHookEnabled', function () {
      repo.webhook = {active: true}
      assert.equal(repo.isWebHookEnabled(), true)
    })

    it('syncHook', function (done) {
      getHook.withArgs('lipp', 'acme-jsdoc-example', 'noauth-tricky').yields(null, null)
      repo.syncHook('noauth-tricky', function (err, repo) {
        assert(!err)
        assert.equal(repo.webhook, false)
        done()
      })
    })

    it('syncHook propagates error', function (done) {
      getHook.withArgs('lipp', 'acme-jsdoc-example', 'noauth-tricky').yields('foo', null)
      repo.syncHook('noauth-tricky', function (err, repo) {
        assert.equal(err, 'foo')
        assert(!repo)
        done()
      })
    })

    it('updateWebHook from off to on', function (done) {
      sandbox.stub(repoModule, 'addHook').withArgs('lipp', 'acme-jsdoc-example', 'noauth').yields(null, 3333)
      repo.webhook = false
      var form = {
        _enabled: 'on'
      }
      repo.updateWebHook(form, 'noauth', function (err, repo_) {
        assert(!err)
        assert.equal(repo, repo_)
        assert.equal(repo.webhook, 3333)
        done()
      })
    })

    it('updateWebHook on to off', function (done) {
      sandbox.stub(repoModule, 'removeHook').withArgs('lipp', 'acme-jsdoc-example', 'noauth').yields(null, 1111)
      repo.webhook = {active: true}
      var form = {}
      repo.updateWebHook(form, 'noauth', function (err, repo_) {
        assert(!err)
        assert.equal(repo, repo_)
        assert.equal(repo.webhook, 1111)
        done()
      })
    })

    it('updateWebHook on to on (does nothing)', function (done) {
      repo.webhook = {active: true}
      var form = {_enabled: 'on'}
      repo.updateWebHook(form, 'noauth', function (err, repo_) {
        assert(!err)
        assert.equal(repo, repo_)
        done()
      })
    })
  })
})
