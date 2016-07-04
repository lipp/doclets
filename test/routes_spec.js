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

  it('.reauth(req, res) destroys session and redirects to /auth/github', function () {
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
    routes.reauth(req, res)
    assert.equal(destroyCalled, true)
    assert(res.redirect.calledWith('/auth/github'))
  })

  it('.docletsYml renders doclets_yml.jade', function () {
    var res = {}
    res.render = sinon.spy()
    var req = {
      user: 123
    }
    routes.docletsYml(req, res)
    assert(res.render.calledWith('doclets_yml.jade', {user: req.user, path: 'doclets.yml'}))
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

  describe('.user(req, res)', function () {
    var findByFullnames
    var fakeUser
    var findById

    beforeEach(function () {
      fakeUser = {populate: function () {}}
      sandbox.stub(fakeUser, 'populate').yields(null, {})
      fakeUser._id = 'lipp'
      findByFullnames = sandbox.stub(Doclet, 'findByFullnames').yields(null, [])
      findById = sandbox.stub(User, 'findById').yields(null, fakeUser)
    })

    it('calls res.status(404) for invalid user', function (done) {
      findById.withArgs('por').yields(null, null)
      var req = {
        params: {
          user: 'por'
        }
      }
      var res = {}
      res.send = function (what) {
        assert.equal(what, 'not found')
        done()
      }
      res.status = function (status) {
        assert.equal(status, 404)
        return res
      }
      routes.user(req, res)
    })

    it('calls res.status(500) for db error', function (done) {
      findById.withArgs('por').yields('arg')
      var req = {
        params: {
          user: 'por'
        }
      }
      var res = {}
      res.send = function (what) {
        assert.equal(what, 'Err: arg')
        done()
      }
      res.status = function (status) {
        assert.equal(status, 500)
        return res
      }
      routes.user(req, res)
    })

    it('basic view params are correct', function (done) {
      var req = {
        user: {
          _id: 'lipp'
        },
        params: {
          user: 'foo'
        }
      }
      var res = {}
      res.render = function (view, params) {
        assert.equal(view, 'user.jade')
        assert.equal(params.user, req.user)
        assert.equal(params.owner, fakeUser)
        assert.equal(params._, _)
        assert.equal(params.moment, moment)
        assert.equal(params.username, 'foo')
        assert.equal(params.path, '/foo')
        done()
      }
      routes.user(req, res)
    })

    it('calls user.syncWithGitHub for own account', function (done) {
      fakeUser.syncWithGitHub = sandbox.stub().yields(null, 555)
      var req = {
        user: {
          _id: 'lipp'
        },
        params: {
          user: 'lipp'
        }
      }
      var res = {}
      res.render = function (view, params) {
        assert(fakeUser.syncWithGitHub.calledOnce)
        assert.equal(params.owner, 555)
        done()
      }
      routes.user(req, res)
    })

    it('calls user.syncWithGitHub for org account', function (done) {
      fakeUser.syncWithGitHub = sandbox.stub().yields(null, 554)
      fakeUser.type = 'Organization'
      fakeUser.token = '123'
      var req = {
        user: {
          _id: 'lipp'
        },
        params: {
          user: 'orga'
        }
      }
      var res = {}
      res.render = function (view, params) {
        assert(fakeUser.syncWithGitHub.calledOnce)
        assert.equal(params.owner, 554)
        done()
      }
      routes.user(req, res)
    })

    it('calls NOT user.syncWithGitHub for foreign account', function (done) {
      fakeUser.syncWithGitHub = sandbox.stub().yields(null, 555)
      var req = {
        user: {
          _id: 'lipp'
        },
        params: {
          user: 'lipp2'
        }
      }
      var res = {}
      res.render = function (view, params) {
        assert.equal(fakeUser.syncWithGitHub.called, false)
        assert.equal(params.owner, fakeUser)
        done()
      }
      routes.user(req, res)
    })

    it('calls user.populate("_accessibleRepos") and passes them to viewparams.repos', function (done) {
      fakeUser.populate.yields(null, {_accessibleRepos: 'the populated repos'})
      var req = {
        user: {
          _id: 'lipp'
        },
        params: {
          user: 'lipp2'
        }
      }
      var res = {}
      res.render = function (view, params) {
        assert(fakeUser.populate.calledOnce)
        assert.equal(params.repos, 'the populated repos')
        done()
      }
      routes.user(req, res)
    })

    it('calls Doclet.findByFullnames with user.accessibleRepos and passes all "public" ones to viewparams.doclets', function (done) {
      fakeUser.accessibleRepos = ['a', 'b']
      var fakeDoclets = [{
        hasUserAccess: function (user) {
          assert.deepEqual(user, req.user)
          return false
        },
        id: 1
      }, {
        hasUserAccess: function (user) {
          assert.deepEqual(user, req.user)
          return true
        },
        id: 2
      }]
      findByFullnames.withArgs(['a', 'b']).yields(null, fakeDoclets)
      var req = {
        user: {
          _id: 'lipp'
        },
        params: {
          user: 'lipp2'
        }
      }
      var res = {}
      res.render = function (view, params) {
        assert.equal(params.doclets.length, 1)
        assert.deepEqual(params.doclets[0], fakeDoclets[1])
        done()
      }
      routes.user(req, res)
    })
  })

  it('.sync(req, res) calls req.user.syncAccessibleRepos and redirects to "/:user"', function () {
    var req = {
      user: {
        _id: 'asd',
        syncAccessibleRepos: sandbox.stub().yields(null)
      }
    }
    var res = {}
    res.redirect = sinon.spy()
    routes.sync(req, res)
    assert(res.redirect.calledWith('/asd'))
    assert(req.user.syncAccessibleRepos.calledOnce)
  })

  it('.sync(req, res) calls req.user.syncAccessibleRepos and calls res.status(500) on error', function () {
    var req = {
      user: {
        _id: 'asd',
        syncAccessibleRepos: sandbox.stub().yields('arg')
      }
    }
    var res = {}
    res.status = sinon.spy(function () {
      return res
    })
    res.send = sinon.spy(function () {})
    routes.sync(req, res)
    assert(res.status.calledWith(500))
    assert(res.send.calledWith('Err arg'))
    assert(req.user.syncAccessibleRepos.calledOnce)
  })

  describe('.changeRepo(req, res)', function () {
    var req
    var res
    var fakeDoclet
    var fakeRepo

    beforeEach(function () {
      req = {
        body: 123,
        user: {
          auth: 'noauth'
        },
        query: {
          repo: 'foo/bar'
        },
        flash: sinon.spy()
      }

      res = {}
      res.redirect = sinon.spy()
      res.status = sinon.stub().returns(res)
      res.send = sinon.spy()

      fakeDoclet = {
        updateIsPublic: sandbox.stub()
      }

      fakeRepo = {}
      fakeRepo.updateWebHook = sandbox.stub()
      fakeRepo.hasUserAccess = sandbox.stub()

      sandbox.stub(Doclet, 'findByFullnames').withArgs(['foo/bar']).yields(null, [fakeDoclet])
      sandbox.stub(Repo, 'findById').withArgs('foo/bar').yields(null, fakeRepo)
    })

    it('on success sets result flash result and redirects to "/asd2/foo"', function () {
      fakeDoclet.updateIsPublic.withArgs(req.body).yields()
      fakeRepo.updateWebHook.withArgs(req.body, req.user.auth).yields(null, fakeRepo)
      fakeRepo.hasUserAccess.withArgs(req.user.auth).yields(null, true)

      routes.changeRepo(req, res)

      assert(res.redirect.calledWith('/foo/bar'))
      assert(req.flash.calledWith('result'))
    })

    it('on no access sets result flash error and redirects to "/asd2/foo"', function () {
      fakeDoclet.updateIsPublic.withArgs(req.body).yields()
      fakeRepo.updateWebHook.withArgs(req.body, req.user.auth).yields(null, fakeRepo)
      fakeRepo.hasUserAccess.withArgs(req.user.auth).yields(null, false)

      routes.changeRepo(req, res)

      assert(res.redirect.calledWith('/foo/bar'))
      assert(req.flash.calledWith('error', 'No admin access to repository'))
    })

    it('on repo.hasUserAccess error calls res.status(500)', function () {
      fakeDoclet.updateIsPublic.withArgs(req.body).yields()
      fakeRepo.updateWebHook.withArgs(req.body, req.user.auth).yields(null, fakeRepo)
      fakeRepo.hasUserAccess.withArgs(req.user.auth).yields('arg')

      routes.changeRepo(req, res)

      assert(res.status.calledWith(500))
      assert(res.send.calledWith('Err arg'))
    })

    it('on repo.updateWebHook error sets flash error', function () {
      fakeDoclet.updateIsPublic.withArgs(req.body).yields()
      fakeRepo.updateWebHook.withArgs(req.body, req.user.auth).yields('arg')
      fakeRepo.hasUserAccess.withArgs(req.user.auth).yields(null, true)

      routes.changeRepo(req, res)

      assert(res.redirect.calledWith('/foo/bar'))
      assert(req.flash.calledWith('error', 'arg'))
    })

    it('on db error calls res.status(500)', function () {
      Doclet.findByFullnames.withArgs(['not/there']).yields('arg')
      req.query.repo = 'not/there'
      routes.changeRepo(req, res)

      assert(res.status.calledWith(500))
      assert(res.send.calledWith('Err arg'))
    })
  })

  describe('.addRepo(req, res)', function () {
    var req
    var res
    var fakeRepo
    var fakeUser

    beforeEach(function () {
      req = {
        body: {
          repo: 'foo/bar'
        },
        user: {
          auth: 'noauth',
          token: 123,
          refreshToken: 333,
          _id: 'lipp',
          image: 'smile'
        },
        flash: sinon.spy()
      }

      res = {}
      res.redirect = sinon.spy()
      res.status = sinon.stub().returns(res)
      res.send = sinon.spy()

      fakeRepo = {}
      fakeRepo.enableWebHook = sandbox.stub()

      fakeUser = {}
      fakeUser.save = sandbox.stub()
    })

    it('calls res.redirect("/:user/:repo")', function () {
      sandbox.stub(Repo, 'findById').withArgs('foo/bar').yields(null, fakeRepo)
      sandbox.stub(User, 'findById').withArgs('foo').yields(null, fakeUser)
      fakeRepo.enableWebHook.withArgs(req.user.auth).yields()
      routes.addRepo(req, res)
      assert(res.redirect.calledWith('/foo/bar'))
    })

    it('calls req.flash("error") on db error', function () {
      sandbox.stub(Repo, 'findById').withArgs('foo/bar').yields('arg')
      sandbox.stub(User, 'findById').withArgs('foo').yields(null, fakeUser)
      routes.addRepo(req, res)
      assert(req.flash.calledWith('error', 'arg'))
      assert(res.redirect.calledWith('/foo'))
    })

    it('calls req.flash("error") on repo.enableWebHook error', function () {
      sandbox.stub(Repo, 'findById').withArgs('foo/bar').yields(null, fakeRepo)
      sandbox.stub(User, 'findById').withArgs('foo').yields(null, fakeUser)
      fakeRepo.enableWebHook.withArgs(req.user.auth).yields('arg')
      routes.addRepo(req, res)
      assert(req.flash.calledWith('error', 'arg'))
      assert(res.redirect.calledWith('/foo'))
    })

    it('set user.token if user.type=="Organization" and user.token is not defined', function () {
      fakeUser.type = 'Organization'
      fakeUser.save.yields()
      sandbox.stub(Repo, 'findById').withArgs('foo/bar').yields(null, fakeRepo)
      sandbox.stub(User, 'findById').withArgs('foo').yields(null, fakeUser)
      fakeRepo.enableWebHook.withArgs(req.user.auth).yields()
      routes.addRepo(req, res)
      assert.equal(fakeUser.token, req.user.token)
      assert.equal(fakeUser.refreshToken, req.user.refreshToken)
      assert.equal(fakeUser.tokenProvider.id, req.user._id)
      assert.equal(fakeUser.tokenProvider.image, req.user.image)
      assert(fakeUser.save.calledOnce)
      assert(res.redirect.calledWith('/foo/bar'))
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

    var fakeUser = {
      updateFromGitHubPassport: sandbox.stub().withArgs(ghUser).yields()
    }

    sandbox.stub(User, 'findOne')
      .withArgs({passportId: ghUser.profile.id})
      .yields(null, fakeUser)

    routes.serializeUser(ghUser, function (err, id) {
      assert(!err)
      assert.equal(id, 123)
      assert(fakeUser.updateFromGitHubPassport.calledOnce)
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

  it('.createPassportUser() yields a user object', function (done) {
    routes.createPassportUser('asd', 'foo', 123, function (err, user) {
      assert(!err)
      assert.equal(user.token, 'asd')
      assert.equal(user.refreshToken, 'foo')
      assert.equal(user.profile, 123)
      done()
    })
  })
})
