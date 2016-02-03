/* global describe it before beforeEach afterEach */
var assert = require('assert')
var Routes = require('../lib/routes').Routes
var sinon = require('sinon')
var Repo = require('../lib/models/repo')
var Doclet = require('../lib/models/doclet')
var User = require('../lib/models/user')
var _ = require('underscore')
var moment = require('moment')

describe('The routes module', function () {
  var routes
  var sandbox

  before(function () {
    routes = new Routes()
  })

  beforeEach(function () {
    sandbox = sinon.sandbox.create()
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('.authGithub()', function () {
    routes.authGithub()
  })

  it('.authGithubCallback(req, res) saves session and redirects to /<user>', function () {
    var saveCalled
    sandbox.stub(User, 'findOne').yields(null, {_id: 'horst'})
    var req = {
      session: {
        passport: {
          user: 12345
        },
        save: function (done) {
          saveCalled = true
          done()
        }
      }
    }
    var res = {}
    res.redirect = sinon.spy()
    routes.authGithubCallback(req, res)
    assert.equal(saveCalled, true)
    assert(res.redirect.calledWith('/horst'))
  })

  it('.logout(req, res) destroys session and redirects to /', function () {
    var destroyCalled
    var req = {
      session: {
        destroy: function (done) {
          destroyCalled = true
          done()
        }
      }
    }
    var res = {}
    res.redirect = sinon.spy()
    routes.logout(req, res)
    assert.equal(destroyCalled, true)
    assert(res.redirect.calledWith('/'))
  })

  it('.ensureAuthenticated(req, res, next) calls next if authenticated', function () {
    var next = sinon.spy()
    var req = {
      isAuthenticated: function () {
        return true
      }
    }
    routes.ensureAuthenticated(req, null, next)
    assert(next.called)
  })

  it('.ensureAuthenticated(req, res, next) calls res.redirect("/") if not authenticated', function () {
    var next = sinon.spy()
    var req = {
      isAuthenticated: function () {
        return false
      }
    }
    var res = {
      redirect: sinon.spy()
    }
    routes.ensureAuthenticated(req, res, next)
    assert.equal(next.called, false)
    assert(res.redirect.calledWith('/'))
  })

  it('.user(req, res) (own repo) res.render("user.jade")', function () {
    sandbox.stub(Doclet, 'findByOwner').yields(null, 345)
    sandbox.stub(User, 'findById').yields(null, 555)
    sandbox.stub(Repo, 'findOrSyncByUser').yields(null, 123)
    var req = {
      user: {
        _id: 'asd',
        token: 'asd'
      },
      params: {
        user: 'asd'
      },
      query: {}
    }
    var res = {}
    res.render = sinon.spy()
    routes.user(req, res)
    var resArgs = res.render.args[0]
    assert.equal(resArgs[0], 'user.jade')
    assert.deepEqual(resArgs[1], {
      user: req.user,
      repos: 123,
      _: _,
      owner: 555,
      doclets: 345,
      moment: moment,
      username: 'asd'
    })
  })

  it('.user(req, res) (other repo) res.render("user.jade")', function () {
    sandbox.stub(Doclet, 'findByOwner').yields(null, 345)
    sandbox.stub(User, 'findById').yields(null, 555)
    sandbox.stub(Repo, 'find').yields(null, 123)
    var req = {
      user: {
        _id: 'asd2',
        token: 'asd'
      },
      params: {
        user: 'asd'
      },
      query: {}
    }
    var res = {}
    res.render = sinon.spy()
    routes.user(req, res)
    var resArgs = res.render.args[0]
    assert.equal(resArgs[0], 'user.jade')
    assert.deepEqual(resArgs[1], {
      user: req.user,
      repos: 123,
      _: _,
      owner: 555,
      doclets: 345,
      moment: moment,
      username: 'asd'
    })
  })

  it('.serializeUser() creating a new User', function (done) {
    var ghUser = {
      profile: {
        id: 123
      }
    }
    sandbox.stub(User, 'findOne')
      .withArgs({passportId: ghUser.profile.id})
      .yields(null, null)

    sandbox.stub(User, 'createFromGitHubPassport')
      .withArgs(ghUser)
      .yields(null, ghUser.profile.id)

    routes.serializeUser(ghUser, function (err, id) {
      assert(!err)
      assert.equal(id, ghUser.profile.id)
      done()
    })
  })

  it('.serializeUser() retrieving an existing User', function (done) {
    var ghUser = {
      profile: {
        id: 123
      }
    }
    sandbox.stub(User, 'findOne')
      .withArgs({passportId: ghUser.profile.id})
      .yields(null, 444)

    routes.serializeUser(ghUser, function (err, id) {
      assert(!err)
      assert.equal(id, 123)
      done()
    })
  })

  it('.serializeUser() propagates error', function (done) {
    var ghUser = {
      profile: {
        id: 123
      }
    }
    sandbox.stub(User, 'findOne')
      .withArgs({passportId: ghUser.profile.id})
      .yields('some error')

    routes.serializeUser(ghUser, function (err, id) {
      assert.equal(err, 'some error')
      assert(!id)
      done()
    })
  })

  it('.deserializeUser() calls User.findOne', function (done) {
    sandbox.stub(User, 'findOne')
      .withArgs({passportId: 123})
      .yields(null, 'user')

    routes.deserializeUser(123, function (err, user) {
      assert(!err)
      assert.equal(user, 'user')
      done()
    })
  })
})
