/* global describe it before */
var assert = require('assert')
var Routes = require('../lib/routes').Routes
var db = require('../lib/db-fake')
var sinon = require('sinon')

var github = {
  repos: {}
}

describe('The routes module', function () {
  var routes

  before(function (done) {
    db.init(done)
    routes = new Routes(db, github)
  })

  it('.authGithub()', function () {
    routes.authGithub()
  })

  it('.authGithubCallback(req, res) saves session and redirects to /', function () {
    var saveCalled
    var req = {
      session: {
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
    assert(res.redirect.calledWith('/'))
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

  it('.ensureAuthenticated(req, res, next) calls res.redirect("/login") if not authenticated', function () {
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
    assert(res.redirect.calledWith('/login'))
  })

  it('.account(req, res) calls req.render("account.jade")', function () {
    var res = {
      render: sinon.spy()
    }
    var req = {
      user: {
        profile: {
          username: 'foo'
        }
      }
    }
    github.repos.getFromUser = function (config, done) {
      assert.equal(config.user, 'foo')
      assert.equal(config.type, 'owner')
      assert.equal(config.per_page, 100)
      done(null, [{
        full_name: 'foo/bar'
      }])
    }
    db.putRepo = function (key, repo, done) {
      assert.equal(key, 'foo/bar')
      assert.deepEqual(repo, {full_name: 'foo/bar', docletsEnabled: false})
      done(null)
    }
    routes.account(req, res)
    assert(res.render.calledWith('account.jade'))
  })

  it('.accountRepos(req, res) updates docletsEnabled setting and calls res.redirect("/account")', function () {
    var res = {
      redirect: sinon.spy()
    }
    var req = {
      user: {
        profile: {
          username: 'foo'
        }
      },
      body: {
        'bar': '',
        'bar2': true,
        'bar3': true,
        'bar4': ''
      }
    }
    db.getReposByUser = function (user, done) {
      assert.equal(user, 'foo')
      done(null, [{
        full_name: 'foo/bar',
        name: 'bar',
        docletsEnabled: false
      }, {
        full_name: 'foo/bar2',
        name: 'bar2',
        docletsEnabled: false
      }, {
        full_name: 'foo/bar3',
        name: 'bar3',
        docletsEnabled: true
      }, {
        full_name: 'foo/bar4',
        name: 'bar4',
        docletsEnabled: true
      }
      ])
    }
    db.putRepo = function (key, repo, done) {
      done(null)
    }
    db.putRepo = sinon.spy(db.putRepo)
    routes.accountRepos(req, res)
    assert(db.putRepo.calledTwice)
    assert(db.putRepo.calledWith('foo/bar2'))
    assert(db.putRepo.calledWith('foo/bar4'))
    assert(res.redirect.calledWith('/account'))
  })
})
