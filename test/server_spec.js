/* global describe it before */
var assert = require('assert')
var server = require('../lib/server')
var db = require('../lib/db-fake')
var gather = require('../lib/gather')
var path = require('path')
var request = require('request')

var user = 'bart'
var repo = 'test'
describe('The gather module', function () {
  before(function (done) {
    var githubUrl = 'https://github.com/' + user + '/' + repo
    server.init(4444, db, done)
    var dir = path.join(__dirname, 'fixtures', 'minimal_1')
    var docData = gather.gatherDocletsAndMeta(dir, githubUrl, 'demo')
    db.put(user + '/' + repo, 'demo', docData, function () {})
  })

  it('GET /bart/test/demo', function (done) {
    request('http://localhost:4444/bart/test/demo', function (err, res, body) {
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })

  it('GET /bart/test/demo/ redirects', function (done) {
    request('http://localhost:4444/bart/test/demo/', function (err, res, body) {
      assert.equal(res.request.uri.pathname, '/bart/test/demo')
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })

  it('GET /bart/test/demo2', function (done) {
    request('http://localhost:4444/bart/test/demo2', function (err, res, body) {
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
      assert.equal(res.statusCode, 500)
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
      assert.equal(res.statusCode, 500)
      done(err)
    })
  })

  it('GET /bart/test/demo/about', function (done) {
    request('http://localhost:4444/bart/test/demo/about', function (err, res, body) {
      assert.equal(res.statusCode, 200)
      done(err)
    })
  })
})
