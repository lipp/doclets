/* global describe it before beforeEach after afterEach */
var assert = require('assert')
var Repo = require('../lib/models/repo')
var User = require('../lib/models/user')
var repoModule = require('../lib/repo')
var services = require('../lib/services')
var path = require('path')
var fs = require('fs')
var mongoose = require('mongoose')
var sinon = require('sinon')

var repoData = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'repos.json'))).slice(0, 4)

describe('The repo model module', function () {
  var sandbox

  before(function (done) {
    mongoose.connect('mongodb://' + services.mongodb.host)
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

  afterEach(function () {
    sandbox.restore()
  })

  it('.findByUser with sync=true returns fake repos', function (done) {
    sandbox.stub(repoModule, 'getUserRepos').yields(null, repoData)
    sandbox.stub(repoModule, 'getHook').yields(null, 123)
    Repo.findByUser('lipp', 'noauth', true, function (err, repos) {
      if (err) {
        done(err)
      } else {
        assert.equal(repos.length, 4)
        assert.equal(repos[0].webhook, 123)
        assert.equal(repos[0].stars, 0)
        done()
      }
    })
  })

  it('.findByUser twice with sync=true will update from changed fake data', function (done) {
    sandbox.stub(repoModule, 'getUserRepos').yields(null, repoData)
    sandbox.stub(repoModule, 'getHook').yields(null, 123)
    Repo.findByUser('lipp', 'noauth', true, function (err, repos) {
      if (err) {
        done(err)
      } else {
        assert.equal(repos[0].stars, 0)
        assert.equal(repos.length, 4)
        repoData[0].stargazers_count = 2
        Repo.findByUser('lipp', 'noauth', true, function (err, repos) {
          repoData[0].stargazers_count = 0
          if (err) {
            done(err)
          } else {
            assert.equal(repos[0].stars, 2)
            done()
          }
        })
      }
    })
  })

  it('.findByUser with sync=false will update from fake data (since repos.length ===0)', function (done) {
    sandbox.stub(repoModule, 'getUserRepos').yields(null, repoData)
    sandbox.stub(repoModule, 'getHook').yields(null, 123)
    Repo.findByUser('lipp', 'noauth', false, function (err, repos) {
      if (err) {
        done(err)
      } else {
        assert.equal(repos.length, 4)
        assert.equal(repos[0].webhook, 123)
        assert.equal(repos[0].stars, 0)
        done()
      }
    })
  })

  it('.findByUser with sync=false will update from fake data (since repos.length ===0)', function (done) {
    sandbox.stub(Repo, 'find').yields(null, [1, 2, 3])
    Repo.findByUser('lipp', 'noauth', false, function (err, repos) {
      if (err) {
        done(err)
      } else {
        assert.deepEqual(repos, [1, 2, 3])
        done()
      }
    })
  })

  describe('hook config', function () {
    before(function (done) {
      var user = new User({
        _id: 'lipp',
        token: '123'
      })
      user.save(done)
    })

    after(function (done) {
      User.remove({}, done)
    })

    it('.enableWebHook()', function (done) {
      sandbox.stub(repoModule, 'getUserRepos').yields(null, repoData)
      sandbox.stub(repoModule, 'getHook').yields(null, 123)
      sandbox.stub(repoModule, 'addHook').yields(null, {active: true})
      Repo.findByUser('lipp', 'noauth', true, function (err, repos) {
        if (err) {
          done(err)
        } else {
          var repo = repos[0]
          assert.equal(repo.webhook, 123)
          repo.enableWebHook(function (err, repo) {
            if (err) {
              done(err)
            } else {
              assert.equal(repo.webhook.active, true)
              assert.equal(repo.isWebHookEnabled(), true)
              done()
            }
          })
        }
      })
    })

    it('.disableWebHook()', function (done) {
      sandbox.stub(repoModule, 'getUserRepos').yields(null, repoData)
      sandbox.stub(repoModule, 'getHook').yields(null, 123)
      sandbox.stub(repoModule, 'removeHook').yields(null, {active: false})
      Repo.findByUser('lipp', 'noauth', true, function (err, repos) {
        if (err) {
          done(err)
        } else {
          var repo = repos[0]
          assert.equal(repo.webhook, 123)
          repo.disableWebHook(function (err, repo) {
            if (err) {
              done(err)
            } else {
              assert.equal(repo.webhook.active, false)
              assert.equal(repo.isWebHookEnabled(), false)
              done()
            }
          })
        }
      })
    })
  })
})
