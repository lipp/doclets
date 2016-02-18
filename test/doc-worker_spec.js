/* global describe it before beforeEach after afterEach */
var assert = require('assert')
var Doclet = require('../lib/models/doclet')
var env = require('../lib/env')
var mongoose = require('mongoose')
var Bull = require('bull')
var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var docWorker = require('../lib/doc-worker')
var repo = require('../lib/repo')
var sinon = require('sinon')
var User = require('../lib/models/user')
var Repo = require('../lib/models/repo')
var async = require('async')

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
    inbox = new Bull('inbox', env.redis.port, env.redis.host)
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

  it('a failing repo.checkout is handled', function (done) {
    var event = loadGitHubEvent('acme-push')
    var failed = new Bull('failed', env.redis.port, env.redis.host)
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
    sandbox.stub(repo, 'checkout').throws('some error')
  })

  it('a failing Doclet.createFromGitHubEvent is handled', function (done) {
    var event = loadGitHubEvent('acme-push')
    var failed = new Bull('failed', env.redis.port, env.redis.host)
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
    var failed = new Bull('failed', env.redis.port, env.redis.host)
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

  describe('with node-jet (get) events', function () {
    var events

    before(function () {
      events = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/node-jet_getevents.json')))
    })

    it('getTags(events)', function () {
      var tags = docWorker.getTags(events)
      assert(Array.isArray(tags))
      assert.equal(tags.length, 0)
    })

    it('getLastPushPerBranch(events) returns only latest master', function () {
      var lppb = docWorker.getLastPushPerBranch(events)
      assert(Array.isArray(lppb))
      assert.equal(lppb.length, 1)
      assert.equal(lppb[0].id, '3646551386')
      assert.equal(lppb[0].payload.ref, 'refs/heads/master')
    })
  })

  describe('with node-jet (get) events', function () {
    var events

    before(function () {
      events = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/acme-jsdoc-example_getevents.json')))
    })

    it('getTags(events)', function () {
      var tags = docWorker.getTags(events)
      assert(Array.isArray(tags))
      assert.equal(tags.length, 7)
      assert.equal(tags[0].id, 3636958336)
      assert.equal(tags[0].payload.ref, 'test-tag')
      assert.equal(tags[6].id, 3453845284)
      assert.equal(tags[6].payload.ref, 'v1.0.0')
    })

    it('getLastPushPerBranch(events) returns only latest master', function () {
      var lppb = docWorker.getLastPushPerBranch(events)
      assert(Array.isArray(lppb))
      assert.equal(lppb.length, 1)
      assert.equal(lppb[0].id, '3644279032')
      assert.equal(lppb[0].payload.ref, 'refs/heads/master')
    })
  })

  describe('catchup tests', function () {
    var events

    before(function () {
      events = JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures/acme-jsdoc-example_getevents.json')))
    })

    beforeEach(function (done) {
      var user = new User({
        _id: 'lipp',
        token: '12345'
      })
      var repo1 = new Repo({
        _id: 'lipp/acme-jsdoc-example',
        name: 'acme-jsdoc-example',
        owner: 'lipp',
        _owner: 'lipp',
        webhook: {active: true}
      })
      var repo2 = new Repo({
        _id: 'lipp/bar2',
        name: 'bar2',
        owner: 'lipp',
        _owner: 'lipp',
        webhook: false
      })
      async.series([
        User.remove.bind(User, {}),
        Repo.remove.bind(Repo, {}),
        user.save.bind(user),
        repo1.save.bind(repo1),
        repo2.save.bind(repo2)
      ], done)
    })

    it('catchUpRepoEvents with no events', function (done) {
      sandbox.stub(repo, 'getRepoEvents').yields(null, [])
      docWorker.catchUpRepoEvents(function () {
        assert('should not be called')
      }, done)
    })

    it('catchUpRepoEvents with events', function (done) {
      sandbox.stub(repo, 'getRepoEvents').yields(null, events)
      var count = 0
      docWorker.catchUpRepoEvents(function (webhookEvent) {
        Doclet.createFromGitHubEvent(webhookEvent, [], function (err) {
          assert(!err)
          ++count
          if (count === 8) { // 7 tags and 1 branch
            done()
          }
        })
      })
    })
  })
})
