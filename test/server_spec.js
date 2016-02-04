/* global describe it before after */

var assert = require('assert')
var server = require('../lib/server')
var gather = require('../lib/gather')
var path = require('path')
var request = require('request')
var async = require('async')
var Doclet = require('../lib/models/doclet')
var User = require('../lib/models/user')
var Repo = require('../lib/models/repo')
var mongoose = require('mongoose')

var userName = 'bart'
var repoName = 'test'
var version = 'v1.0.1'

var clearDb = function (done) {
  mongoose.connection.once('open', function () {
    mongoose.connection.db.dropDatabase(done)
  })
}

describe('The server module', function () {
  this.timeout(4000)

  after(function (done) {
    mongoose.connection.close(done)
  })

  before(function (done) {
    var dir = path.join(__dirname, '../fixtures', 'minimal_1')
    var repoId = [userName, repoName].join('/')

    var doclet = new Doclet()
    doclet._id = [userName, repoName, version].join('/')
    doclet.version = version
    doclet.type = 'tag'
    doclet.repo = repoName
    doclet._repo = repoId
    doclet.owner = userName
    doclet._owner = userName
    doclet.tagOrHash = '1235'
    doclet.data = gather.gatherDocletsAndMeta(dir)

    var user = new User()
    user._id = userName
    user.passportId = '12345'
    user.name = 'Bart'
    user.email = 'asd'
    user.url = 'pp'
    user.token = '123456'
    user.image = 'bla'

    var repo = new Repo()
    repo._id = repoId
    repo.name = repoName
    repo.owner = userName
    repo._owner = userName
    repo._doclets = [doclet._id]
    repo.webhook = {}
    repo.description = ''

    async.series([
      server.init.bind(null, 4444),
      clearDb,
      doclet.save.bind(doclet),
      user.save.bind(user),
      repo.save.bind(repo)
    ], done)
  })

  it('GET /bart/test/v1.0.1', function (done) {
    request('http://localhost:4444/bart/test/v1.0.1', function (err, res, body) {
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })

  it('GET /', function (done) {
    request('http://localhost:4444/', function (err, res, body) {
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })

  it('GET /search?q=' + repoName, function (done) {
    request('http://localhost:4444/search?q=' + repoName, function (err, res, body) {
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })

  it('GET /bart/test/v1.0.1/ redirects', function (done) {
    request('http://localhost:4444/bart/test/v1.0.1/', function (err, res, body) {
      assert.equal(res.request.uri.pathname, '/bart/test/v1.0.1')
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })

  it('GET /bart/test/v1.0.12', function (done) {
    request('http://localhost:4444/bart/test/v1.0.12', function (err, res, body) {
      assert.equal(res.statusCode, 500)
      done(err)
    })
  })

  it('GET /bart/test', function (done) {
    request('http://localhost:4444/bart/test', function (err, res, body) {
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })

  it('GET /bart/test2', function (done) {
    request('http://localhost:4444/bart/test2', function (err, res, body) {
      assert.equal(res.statusCode, 404)
      done(err)
    })
  })

  it('GET /bart', function (done) {
    request('http://localhost:4444/bart', function (err, res, body) {
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })

  it('GET /bart2', function (done) {
    request('http://localhost:4444/bart2', function (err, res, body) {
      assert.equal(res.statusCode, 404)
      done(err)
    })
  })

  it('GET /bart/test/v1.0.1/about', function (done) {
    request('http://localhost:4444/bart/test/v1.0.1/about', function (err, res, body) {
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })

  it('GET /bart/test/v1.0.12/about', function (done) {
    request('http://localhost:4444/bart/test/v1.0.12/about', function (err, res, body) {
      assert.equal(res.statusCode, 500)
      done(err)
    })
  })
})
