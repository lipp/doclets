/* global describe it before beforeEach after afterEach */
var assert = require('assert')
var Doclet = require('../lib/models/doclet')
var services = require('../lib/services')
var mongoose = require('mongoose')
var Bull = require('bull')
var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var docWorker = require('../lib/doc-worker')
var sinon = require('sinon')

var loadGitHubEvent = function (eventDir) {
  var payload = fs.readFileSync(path.join(__dirname, '../fixtures/events', eventDir, 'payload.json'))
  return JSON.parse(payload)
}

var tmpPath = path.join(__dirname, 'git-temp')

describe('The doc-worker module', function () {
  this.timeout(10000)
  this.slow(8000)
  var inbox
  var sandbox

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
    sandbox = sinon.sandbox.create()
    Doclet.remove({}, done)
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('a push event will create a doclet', function (done) {
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

  it('a failing Doclet.createFromGitHubEvent is handled', function (done) {
    var event = loadGitHubEvent('acme-push')
    var failed = new Bull('failed', services.redis.port, services.redis.host)
    failed.on('ready', function () {
      inbox.add(event)
      failed.process(function (job, jobDone) {
        assert.equal(job.data.ref, event.ref)
        jobDone()
        inbox.count().then(function (count) {
          assert.equal(count, 0)
          done()
        })
        failed.close()
      })
    })
    sandbox.stub(Doclet, 'createFromGitHubEvent').yields('some error')
  })

  it('a tag event will create a doclet', function (done) {
    var event = loadGitHubEvent('acme-tag')
    inbox.add(event)
    setTimeout(function () {
      Doclet.findById('lipp/acme-jsdoc-example/v1.0.11', function (err, doclet) {
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

  it('pushing a trash event to the inbox will not create a doclet', function (done) {
    var event = {a: 123}
    sandbox.stub(Doclet, 'createFromGitHubEvent')
    var failed = new Bull('failed', services.redis.port, services.redis.host)
    failed.on('ready', function () {
      inbox.add(event)
      failed.process(function (job, jobDone) {
        assert.equal(job.data.a, 123)
        jobDone()
        failed.close().then(done)
      })
    })
  })

  it('pushing a push event with non branch head ref will not create a doclet', function (done) {
    var event = loadGitHubEvent('acme-push')
    event.ref = 'refs/foo/master'
    sandbox.stub(Doclet, 'createFromGitHubEvent')
    inbox.add(event)
    setTimeout(function () {
      assert(!Doclet.createFromGitHubEvent.called)
      inbox.count().then(function (count) {
        assert.equal(count, 0)
        done()
      })
    }, 100)
  })
})
