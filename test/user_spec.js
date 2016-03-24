/* global describe it before beforeEach after afterEach */
var assert = require('assert')
var User = require('../lib/models/user')
var env = require('../lib/env')
var mongoose = require('mongoose')
var repoModule = require('../lib/repo')
var sinon = require('sinon')

var ghPassport = {
  token: 'token',
  refreshToken: 'token2',
  profile: {
    id: '123',
    username: 'lipp',
    displayName: 'Gerhard',
    _json: {
      email: 'foo@bla.com',
      html_url: 'http://bla.com',
      avatar_url: 'http://avatar.de'
    }
  }
}

describe('The user module', function () {
  before(function (done) {
    mongoose.connect('mongodb://' + env.mongodb.host, done)
  })

  after(function (done) {
    mongoose.connection.close(done)
  })

  beforeEach(function (done) {
    User.remove({}, done)
  })

  it('.createFromGitHubPassport creates db entry', function (done) {
    User.createFromGitHubPassport(ghPassport, function (err) {
      if (err) {
        done(err)
      } else {
        User.findById('lipp', function (err, user) {
          if (err) {
            done(err)
          } else {
            assert.equal(user.passportId, ghPassport.profile.id)
            assert.equal(user.name, ghPassport.profile.displayName)
            assert.equal(user._id, ghPassport.profile.username)
            assert.equal(user.email, ghPassport.profile._json.email)
            assert.equal(user.url, ghPassport.profile._json.html_url)
            assert.equal(user.image, ghPassport.profile._json.avatar_url)
            assert.equal(user.token, ghPassport.token)
            assert.equal(user.refreshToken, ghPassport.refreshToken)
            done()
          }
        })
      }
    })
  })

  describe('with a user db entry', function () {
    var user
    var sandbox

    beforeEach(function (done) {
      sandbox = sinon.sandbox.create()
      User.remove({}, function () {
        User.createFromGitHubPassport(ghPassport, function (err, newUser) {
          user = newUser
          done(err)
        })
      })
    })

    afterEach(function () {
      sandbox.restore()
    })

    it('.updateFromGitHubPassport() updates tokens', function (done) {
      user.updateFromGitHubPassport({token: 'asd', refreshToken: '444'}, function (err) {
        assert(!err)
        User.findById(ghPassport.profile.username, function (err, user) {
          assert(!err)
          assert.equal(user.token, 'asd')
          assert.equal(user.refreshToken, '444')
          done()
        })
      })
    })

    it('.syncWithGitHub() on success fills additional fields', function (done) {
      var ghUser = {
        email: 'asd',
        name: 'horst',
        company: 'apple',
        blog: 'foo',
        location: 'darmstadt',
        bio: 'i am'
      }

      sandbox.stub(repoModule, 'getUser').yields(null, ghUser)
      user.syncWithGitHub(function (err, syncedUser) {
        assert(!err)
        assert.equal(syncedUser.passportId, ghPassport.profile.id)
        assert.equal(syncedUser._id, ghPassport.profile.username)
        assert.equal(syncedUser.email, ghUser.email)
        assert.equal(syncedUser.name, ghUser.name)
        assert.equal(syncedUser.blog, ghUser.blog)
        assert.equal(syncedUser.company, ghUser.company)
        assert.equal(syncedUser.location, ghUser.location)
        assert.equal(syncedUser.bio, ghUser.bio)
        assert.equal(syncedUser.needsReauth, false)
        done()
      })
    })

    it('.syncWithGitHub() on auth fail leaves user and sets needsReauth=true', function (done) {
      sandbox.stub(repoModule, 'getUser').yields({code: 401})
      user.syncWithGitHub(function (err, syncedUser) {
        assert(!err)
        assert.equal(syncedUser.passportId, ghPassport.profile.id)
        assert.equal(syncedUser.name, ghPassport.profile.displayName)
        assert.equal(syncedUser._id, ghPassport.profile.username)
        assert.equal(syncedUser.needsReauth, true)
        done()
      })
    })

    it('.syncWithGitHub() forwards other errors', function (done) {
      sandbox.stub(repoModule, 'getUser').yields({code: 123})
      user.syncWithGitHub(function (err, syncedUser) {
        assert(err)
        assert.equal(err.code, 123)
        assert(!syncedUser)
        done()
      })
    })
  })
})
