/* global describe it before beforeEach after */
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
  before(function (done) {
    sinon.stub(repoModule, 'getUserRepos').yields(null, repoData)
    sinon.stub(repoModule, 'getHook').yields(null, 123)
    mongoose.connect('mongodb://' + services.mongodb.host)
    User.remove({}, done)
  })

  after(function (done) {
    mongoose.connection.close()
    mongoose.connection.once('close', done)
  })

  beforeEach(function (done) {
    Repo.remove({}, done)
  })

  it('.createFromGitHubEvent with push event creates db entry', function (done) {
    Repo.findByUser('lipp', 'noauth', function (err, repos) {
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

  it('.createFromGitHubEvent twice will with push event creates db entry', function (done) {
    Repo.findByUser('lipp', 'noauth', function (err, repos) {
      if (err) {
        done(err)
      } else {
        assert.equal(repos[0].stars, 0)
        assert.equal(repos.length, 4)
        repoData[0].stargazers_count = 2
        Repo.findByUser('lipp', 'noauth', function (err, repos) {
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

  describe('hook config', function () {
    before(function (done) {
      sinon.stub(repoModule, 'addHook').yields(null, 'active')
      sinon.stub(repoModule, 'removeHook').yields(null, 'inactive')
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
      Repo.findByUser('lipp', 'noauth', function (err, repos) {
        if (err) {
          done(err)
        } else {
          var repo = repos[0]
          assert.equal(repo.webhook, 123)
          repo.enableWebHook(function (err, repo) {
            if (err) {
              done(err)
            } else {
              assert.equal(repo.webhook, 'active')
              done()
            }
          })
        }
      })
    })

    it('.disableWebHook()', function (done) {
      Repo.findByUser('lipp', 'noauth', function (err, repos) {
        if (err) {
          done(err)
        } else {
          var repo = repos[0]
          assert.equal(repo.webhook, 123)
          repo.disableWebHook(function (err, repo) {
            if (err) {
              done(err)
            } else {
              assert.equal(repo.webhook, 'inactive')
              done()
            }
          })
        }
      })
    })
  })
})
