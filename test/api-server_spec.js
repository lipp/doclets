/* global describe it before beforeEach */
var assert = require('assert')
var apiServer = require('../lib/api-server')
var request = require('request')
var Bull = require('bull')
var services = require('../lib/services')
var async = require('async')
var path = require('path')
var fs = require('fs')

var replayGitHubEvent = function (eventDir, done) {
  var payload = fs.readFileSync(path.join(__dirname, 'fixtures/events', eventDir, 'payload.json'))
  var headers = require(path.join(__dirname, 'fixtures/events', eventDir, 'headers.js'))
  request({
    url: 'http://localhost:9876/github/callback',
    method: headers.method,
    body: payload,
    headers: headers
  }, done)
}

describe('The api-server module', function () {
  this.timeout(4000)

  var inbox

  before(function (done) {
    apiServer.init(9876)
    inbox = new Bull('inbox', services.redis.port, services.redis.host)
    inbox.on('ready', done)
  })

  beforeEach(function (done) {
    var cleaners = ['completed', 'waiting', 'delayed', 'failed'].map(function (type) {
      return async.asyncify(inbox.clean.bind(inbox, 0, type))
    })
    async.series(cleaners, done)
  })

  it('HTTP POST Push Event to /github/callback created inbox entry', function (done) {
    replayGitHubEvent('acme-push', function (err, res) {
      assert(!err)
      assert.equal(res.statusCode, 200)
      setTimeout(function () {
        inbox.count()
          .then(function (count) {
            assert.equal(count, 1)
            done()
          })
          .catch(done)
      }, 300)
    })
  })

  it('HTTP POST Create Event to /github/callback created inbox entry', function (done) {
    replayGitHubEvent('acme-tag', function (err, res) {
      assert(!err)
      assert.equal(res.statusCode, 200)
      setTimeout(function () {
        inbox.count()
          .then(function (count) {
            assert.equal(count, 1)
            done()
          })
          .catch(done)
      }, 100)
    })
  })
})
