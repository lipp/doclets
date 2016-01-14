/* global describe it before beforeEach after */
var assert = require('assert')
var Doclet = require('../lib/models/doclet')
var services = require('../lib/services')
var mongoose = require('mongoose')
var Bull = require('bull')
var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var docWorker = require('../lib/doc-worker')

var loadGitHubEvent = function (eventDir) {
  var payload = fs.readFileSync(path.join(__dirname, 'fixtures/events', eventDir, 'payload.json'))
  return JSON.parse(payload)
}

var tmpPath = path.join(__dirname, 'git-temp')

describe('The doc-worker module', function () {
  this.timeout(10000)
  var inbox

  before(function (done) {
    docWorker.init(tmpPath)
    inbox = new Bull('inbox', services.redis.port, services.redis.host)
    inbox.on('ready', done)
  })

  after(function (done) {
    fse.removeSync(tmpPath)
    mongoose.connection.close(done)
  })

  beforeEach(function (done) {
    Doclet.remove({}, done)
  })

  it('pushing a push event to the inbox will create a doclet', function (done) {
    var event = loadGitHubEvent('acme-push')
    inbox.add(event)
    setTimeout(function () {
      Doclet.findById('lipp/acme-jsdoc-example/master', function (err, doclet) {
        if (err) {
          done(err)
        } else {
          assert(doclet)
          inbox.count().then(function (count) {
            assert.equal(count, 0)
            done()
          })
        }
      })
    }, 3000)
  })

  it('pushing a push event to the inbox will create a doclet', function (done) {
    var event = loadGitHubEvent('acme-push')
    inbox.add(event)
    setTimeout(function () {
      Doclet.findById('lipp/acme-jsdoc-example/master', function (err, doclet) {
        if (err) {
          done(err)
        } else {
          assert(doclet)
          inbox.count().then(function (count) {
            assert.equal(count, 0)
            done()
          })
        }
      })
    }, 3000)
  })
})
