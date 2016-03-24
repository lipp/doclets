/* global describe it before beforeEach after afterEach */
var assert = require('assert')
var User = require('../lib/models/user')
var Repo = require('../lib/models/repo')
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
  var sandbox

  before(function (done) {
    mongoose.connect('mongodb://' + env.mongodb.host, done)
  })

  after(function (done) {
    mongoose.connection.close(done)
  })

  beforeEach(function (done) {
    sandbox = sinon.sandbox.create()
    User.remove({}, done)
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('statics', function () {
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

    it('.syncOrCreateOrg() with new org', function (done) {
      var org = {
        login: 'foo',
        html_url: 'asd',
        id: 1235,
        name: 'Foo Bar',
        description: 'This is a test',
        email: '123',
        avatar_url: 'http://asd.com',
        location: 'here',
        blog: 'yes'
      }
      User.syncOrCreateOrg(org, function (err, user) {
        assert(!err)
        assert.equal(user.url, org.html_url)
        assert.equal(user._id, org.login)
        assert.equal(user.id, org.id)
        assert.equal(user.name, org.name)
        assert.equal(user.bio, org.description)
        assert.equal(user.image, org.avatar_url)
        assert.equal(user.type, 'Organization')
        User.findOne({id: org.id}, function (err, user_) {
          assert(!err)
          assert(user_)
          assert.equal(user_._id, user._id)
          assert.equal(user_.createdAt.toString(), user.createdAt.toString())
          done()
        })
      })
    })

    it('.syncOrCreateOrgs() with existing org', function (done) {
      var org = {
        login: 'foo',
        html_url: 'asd',
        id: 1235,
        name: 'Foo Bar',
        description: 'This is a test',
        email: '123',
        avatar_url: 'http://asd.com',
        location: 'here',
        blog: 'yes'
      }
      User.syncOrCreateOrg(org, function (err, user) {
        assert(!err)
        org.location = 'there'
        var firstCreated = user.createdAt
        User.syncOrCreateOrg(org, function (err, user) {
          assert(!err)
          User.findOne({id: org.id}, function (err, user) {
            assert(!err)
            assert.equal(user.url, org.html_url)
            assert.equal(user._id, org.login)
            assert.equal(user.id, org.id)
            assert.equal(user.name, org.name)
            assert.equal(user.bio, org.description)
            assert.equal(user.image, org.avatar_url)
            assert.equal(user.type, 'Organization')
            assert.equal(firstCreated.toString(), user.createdAt.toString())
            done()
          })
        })
      })
    })

    it('.syncOrCreateOrgs() with existing org renaming it', function (done) {
      var org = {
        login: 'foo',
        html_url: 'asd',
        id: 1235,
        name: 'Foo Bar',
        description: 'This is a test',
        email: '123',
        avatar_url: 'http://asd.com',
        location: 'here',
        blog: 'yes'
      }
      User.syncOrCreateOrg(org, function (err, user) {
        assert(!err)
        org.login = 'newfoo'
        sandbox.stub(Repo, 'changeOwner').withArgs('foo', 'newfoo').yields()
        sandbox.stub(User, 'remove').withArgs({id: org.id}).yields()
        var firstCreated = user.createdAt
        User.syncOrCreateOrg(org, function (err, user) {
          assert(!err)
          console.log('done rename')
          User.findOne({id: org.id}, function (err, user) {
            assert(!err)
            assert.equal(user._id, 'newfoo')
            assert.equal(user.id, org.id)
            assert.equal(user.name, org.name)
            assert.equal(user.type, 'Organization')
            assert.equal(firstCreated.toString(), user.createdAt.toString())
            done()
          })
        })
      })
    })

    it('.syncOrCreateOrgs() propagates error', function (done) {
      sandbox.stub(User, 'findOne').withArgs({id: 33}).yields('arg')
      User.syncOrCreateOrg({id: 33}, function (err, user) {
        assert(!user)
        assert.equal(err, 'arg')
        done()
      })
    })
  })

  describe('methods', function () {
    var user

    beforeEach(function (done) {
      User.remove({}, function () {
        User.createFromGitHubPassport(ghPassport, function (err, newUser) {
          user = newUser
          done(err)
        })
      })
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

    it('.auth returns nodegit auth object', function () {
      assert.deepEqual(user.auth, {type: 'oauth', token: user.token})
    })

    it('.syncAccessibleRepos for users', function (done) {
      sandbox.stub(Repo, 'sync').withArgs('lipp', user.auth).yields(null, ['a/b', 'c/d'])
      user.syncAccessibleRepos(function (err, user) {
        assert(!err)
        assert.equal(user.accessibleRepos.length, 2)
        assert.equal(user.accessibleRepos[0], 'a/b')
        assert.equal(user.accessibleRepos[1], 'c/d')
        assert.equal(user._accessibleRepos.length, 2)
        assert.equal(user._accessibleRepos[0], 'a/b')
        assert.equal(user._accessibleRepos[1], 'c/d')
        done()
      })
    })

    it('.syncAccessibleRepos for orgs', function (done) {
      user.type = 'Organization'
      sandbox.stub(Repo, 'sync').withArgs('lipp', user.auth).yields(null, ['lipp/b', 'c/d'])
      user.syncAccessibleRepos(function (err, user) {
        assert(!err)
        assert.equal(user.accessibleRepos.length, 1)
        assert.equal(user.accessibleRepos[0], 'lipp/b')
        assert.equal(user._accessibleRepos.length, 1)
        assert.equal(user._accessibleRepos[0], 'lipp/b')
        done()
      })
    })

    it('.syncAccessibleRepos propagates error', function (done) {
      sandbox.stub(Repo, 'sync').withArgs('lipp', user.auth).yields('arg')
      user.syncAccessibleRepos(function (err, user) {
        assert(!user)
        assert.equal(err, 'arg')
        done()
      })
    })

    it('.syncOrgs', function (done) {
      var getOrg = sandbox.stub(repoModule, 'getOrg')
      getOrg.withArgs('foo', user.auth).yields(null, 123)
      getOrg.withArgs('bar', user.auth).yields(null, 321)
      var syncOrCreateOrg = sandbox.stub(User, 'syncOrCreateOrg')
      syncOrCreateOrg.withArgs(123).yields(null)
      syncOrCreateOrg.withArgs(321).yields(null)
      user.syncOrgs([{login: 'foo'}, {login: 'bar'}], done)
    })

    it('.syncOrgs propagates error', function (done) {
      var getOrg = sandbox.stub(repoModule, 'getOrg')
      getOrg.withArgs('foo', user.auth).yields('arg')
      getOrg.withArgs('bar', user.auth).yields(null, 321)
      var syncOrCreateOrg = sandbox.stub(User, 'syncOrCreateOrg')
      syncOrCreateOrg.withArgs(321).yields(null)
      user.syncOrgs([{login: 'foo'}, {login: 'bar'}], function (err) {
        assert.equal(err, 'arg')
        done()
      })
    })

    it('.hasRequiredGitHubAccess missing scopes', function (done) {
      sandbox.stub(repoModule, 'getAuthScopes').withArgs(user.auth).yields(null, ['repo'])
      user.hasRequiredGitHubAccess(function (err, ok) {
        assert(!err)
        assert.equal(ok, false)
        done()
      })
    })

    it('.hasRequiredGitHubAccess complete scopes', function (done) {
      sandbox.stub(repoModule, 'getAuthScopes').withArgs(user.auth).yields(null, ['repo', 'read:org', 'user:email', 'write:repo_hook'])
      user.hasRequiredGitHubAccess(function (err, ok) {
        assert(!err)
        assert.equal(ok, true)
        done()
      })
    })

    it('.hasRequiredGitHubAccess propagates error', function (done) {
      sandbox.stub(repoModule, 'getAuthScopes').withArgs(user.auth).yields('arg')
      user.hasRequiredGitHubAccess(function (err, ok) {
        assert.equal(err, 'arg')
        assert(!ok)
        done()
      })
    })

    it('.syncDetailsAndOrgs() on success fills additional fields', function (done) {
      var ghUser = {
        email: 'asd',
        name: 'horst',
        company: 'apple',
        blog: 'foo',
        location: 'darmstadt',
        bio: 'i am'
      }
      sandbox.stub(repoModule, 'getUser').yields(null, ghUser, [123])
      sandbox.stub(user, 'syncOrgs').withArgs([123]).yields(null)
      user.syncDetailsAndOrgs(function (err, syncedUser) {
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

    it('.syncDetailsAndOrgs() forwards other errors', function (done) {
      sandbox.stub(repoModule, 'getUser').yields({code: 123})
      user.syncDetailsAndOrgs(function (err, syncedUser) {
        assert(err)
        assert.equal(err.code, 123)
        assert(!syncedUser)
        done()
      })
    })

    it('syncWithGithub() with missing scopes sets user.needsReauth = "more-rights"', function (done) {
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields(null, false)
      user.syncWithGitHub(function (err, user) {
        assert(!err)
        assert.equal(user.needsReauth, 'more-rights')
        done()
      })
    })

    it('syncWithGithub() with invalid token sets user.needsReauth = true', function (done) {
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields({code: 401})
      user.syncWithGitHub(function (err, user) {
        assert(!err)
        assert.equal(user.needsReauth, true)
        done()
      })
    })

    it('syncWithGithub() with other errors propagates error', function (done) {
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields({code: 402})
      user.syncWithGitHub(function (err, user) {
        assert(!user)
        assert.equal(err.code, 402)
        done()
      })
    })

    it('syncWithGithub() when all set (user)', function (done) {
      user._accessibleRepos = [1, 2]
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields(null, true)
      sandbox.stub(user, 'syncDetailsAndOrgs').yields(null)
      user.syncWithGitHub(done)
    })

    it('syncWithGithub() with missing _assessibleRepos calls .syncAccessibleRepos', function (done) {
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields(null, true)
      sandbox.stub(user, 'syncDetailsAndOrgs').yields(null)
      sandbox.stub(user, 'syncAccessibleRepos').yields(null)
      user.syncWithGitHub(done)
    })

    it('syncWithGithub() with empty _assessibleRepos calls .syncAccessibleRepos', function (done) {
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields(null, true)
      user._accessibleRepos = []
      sandbox.stub(user, 'syncDetailsAndOrgs').yields(null)
      sandbox.stub(user, 'syncAccessibleRepos').yields(null)
      user.syncWithGitHub(done)
    })

    it('syncWithGithub() when all set (orga)', function (done) {
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields(null, true)
      user._accessibleRepos = [1, 2]
      user.type = 'Organization'
      sandbox.stub(user, 'syncDetailsAndOrgs').yields(null)
      user.syncWithGitHub(done)
    })

    it('syncWithGithub() when createdAt is defined, leaves as is', function (done) {
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields(null, true)
      var createdAt = user.createdAt
      user._accessibleRepos = [1, 2]
      sandbox.stub(user, 'syncDetailsAndOrgs').yields(null)
      user.syncWithGitHub(function (err, user) {
        assert(!err)
        assert.equal(user.createdAt.toString(), createdAt.toString())
        done()
      })
    })

    it('syncWithGithub() when createdAt is NOT defined creates', function (done) {
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields(null, true)
      user._accessibleRepos = [1, 2]
      user.createdAt = false
      sandbox.stub(user, 'syncDetailsAndOrgs').yields(null)
      user.syncWithGitHub(function (err, user) {
        assert(!err)
        assert(user.createdAt)
        done()
      })
    })

    it('syncWithGithub() propagates error', function (done) {
      sandbox.stub(user, 'hasRequiredGitHubAccess').yields(null, true)
      sandbox.stub(user, 'syncAccessibleRepos').yields('arg')
      user.syncWithGitHub(function (err, user) {
        assert.equal(err, 'arg')
        assert(!user)
        done()
      })
    })
  })
})
