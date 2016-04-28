/* global describe it before beforeEach after afterEach*/
var assert = require('assert')
var Doclet = require('../lib/models/doclet')
var Repo = require('../lib/models/repo')
var env = require('../lib/env')
var path = require('path')
var fs = require('fs')
var mongoose = require('mongoose')
var async = require('async')
var sinon = require('sinon')

var loadGitHubEvent = function (eventDir) {
  var payload = fs.readFileSync(path.join(__dirname, '../fixtures/events', eventDir, 'payload.json'))
  return JSON.parse(payload)
}

describe('The doclet module', function () {
  var sandbox

  before(function () {
    mongoose.connect('mongodb://' + env.mongodb.host)
  })

  after(function () {
    mongoose.connection.close()
  })

  beforeEach(function (done) {
    Doclet.remove({}, done)
    sandbox = sinon.sandbox.create()
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('.findByFullnames returns all mathing repos', function (done) {
    var find = sandbox.stub(Doclet, 'find')
    find.withArgs({owner: 'a', repo: 'b'}).yields(null, [123])
    find.withArgs({owner: 'e', repo: 'r'}).yields(null, [])
    find.withArgs({owner: 'c', repo: 'd'}).yields(null, [333])
    Doclet.findByFullnames(['a/b', 'c/d', 'e/r'], function (err, repos) {
      assert(repos.indexOf(123) > -1)
      assert(repos.indexOf(333) > -1)
      assert.equal(repos.length, 2)
      assert(!err)
      done()
    })
  })

  it('.findByFullnames propagates error', function (done) {
    var find = sandbox.stub(Doclet, 'find')
    find.withArgs({owner: 'a', repo: 'b'}).yields(null, [123])
    find.withArgs({owner: 'e', repo: 'r'}).yields('arg')
    Doclet.findByFullnames(['a/b', 'c/d', 'e/r'], function (err, repos) {
      assert.equal(err, 'arg')
      assert(!repos)
      done()
    })
  })

  it('.createFromGitHubEvent with push event creates db entry', function (done) {
    Doclet.createFromGitHubEvent(loadGitHubEvent('acme-push'), [], function (err) {
      if (err) {
        done(err)
      }
      Doclet.findById('lipp/acme-jsdoc-example/master', function (err, doclet) {
        if (err) {
          done(err)
        }
        assert(doclet)
        assert.equal(doclet._repo, 'lipp/acme-jsdoc-example')
        assert.equal(doclet.repo, 'acme-jsdoc-example')
        done()
      })
    })
  })

  it('.createFromGitHubEvent with tag event creates db entry', function (done) {
    Doclet.createFromGitHubEvent(loadGitHubEvent('acme-tag'), [], function (err) {
      if (err) {
        done(err)
      }
      Doclet.findById('lipp/acme-jsdoc-example/v1.0.11', function (err, doclet) {
        if (err) {
          done(err)
        }
        assert(doclet)
        assert.equal(doclet._repo, 'lipp/acme-jsdoc-example')
        assert.equal(doclet.repo, 'acme-jsdoc-example')
        assert.equal(doclet.isPublic, true)
        done()
      })
    })
  })

  it('.createFromGitHubEvent with push event twice updates db entry but leaves "isPublic" unchanged', function (done) {
    var event = loadGitHubEvent('acme-push')

    async.series([
      Doclet.createFromGitHubEvent.bind(Doclet, event, 'nodata'),
      function (callback) {
        Doclet.findById('lipp/acme-jsdoc-example/master', function (err, doclet) {
          if (err) {
            callback(err)
          } else {
            assert.equal(doclet.isPublic, true)
            // disable is Public
            doclet.updateIsPublic({}, callback)
          }
        })
      },
      function (callback) {
        var prevDate = new Date(event.head_commit.timestamp)
        prevDate.setYear(prevDate.getFullYear() + 1)
        event.after = 'aksjdhkdsjhd'
        event.head_commit.timestamp = prevDate // date must be increased
        Doclet.createFromGitHubEvent(event, 'moredata', callback)
      },
      Doclet.findById.bind(Doclet, 'lipp/acme-jsdoc-example/master')
    ], function (err, results) {
      if (err) {
        done(err)
      }
      var doclet = results[3]
      assert(doclet)
      assert.equal(doclet._repo, 'lipp/acme-jsdoc-example')
      assert.equal(doclet.repo, 'acme-jsdoc-example')
      assert.equal(doclet.data, 'moredata')
      assert.equal(doclet.isPublic, false)
      done()
    })
  })

  it('.createFromGitHubEvent with push event twice with same HASH does not update db entry', function (done) {
    var event = loadGitHubEvent('acme-push')

    async.series([
      Doclet.createFromGitHubEvent.bind(Doclet, event, 'nodata'),
      function (callback) {
        Doclet.findById('lipp/acme-jsdoc-example/master', function (err, doclet) {
          if (err) {
            callback(err)
          } else {
            assert.equal(doclet.isPublic, true)
            // disable is Public
            doclet.updateIsPublic({}, callback)
          }
        })
      },
      function (callback) {
        var prevDate = new Date(event.head_commit.timestamp)
        prevDate.setYear(prevDate.getFullYear() - 1)
        event.after = 'aksjdhkdsjhd'
        event.head_commit.timestamp = prevDate // date must be increased
        Doclet.createFromGitHubEvent(event, 'moredata', callback)
      },
      Doclet.findById.bind(Doclet, 'lipp/acme-jsdoc-example/master')
    ], function (err, results) {
      if (err) {
        done(err)
      }
      var doclet = results[3]
      assert(doclet)
      assert.equal(doclet._repo, 'lipp/acme-jsdoc-example')
      assert.equal(doclet.repo, 'acme-jsdoc-example')
      assert.equal(doclet.data, 'nodata')
      assert.equal(doclet.isPublic, false)
      done()
    })
  })

  it('.createFromGitHubEvent with push event twice with changed HASH but older timestamp does not update db entry', function (done) {
    var event = loadGitHubEvent('acme-push')

    async.series([
      Doclet.createFromGitHubEvent.bind(Doclet, event, 'nodata'),
      function (callback) {
        Doclet.findById('lipp/acme-jsdoc-example/master', function (err, doclet) {
          if (err) {
            callback(err)
          } else {
            assert.equal(doclet.isPublic, true)
            // disable is Public
            doclet.updateIsPublic({}, callback)
          }
        })
      },
      function (callback) {
        Doclet.createFromGitHubEvent(event, 'moredata', callback)
      },
      Doclet.findById.bind(Doclet, 'lipp/acme-jsdoc-example/master')
    ], function (err, results) {
      if (err) {
        done(err)
      }
      var doclet = results[3]
      assert(doclet)
      assert.equal(doclet._repo, 'lipp/acme-jsdoc-example')
      assert.equal(doclet.repo, 'acme-jsdoc-example')
      assert.equal(doclet.data, 'nodata')
      assert.equal(doclet.isPublic, false)
      done()
    })
  })

  describe('with a minimal doclet instance', function () {
    var doclet

    before(function (done) {
      Repo.remove({}, function (err) {
        assert(!err)
        var repo = new Repo({
          _id: 'lipp/acme-jsdoc-example',
          name: 'acme-jsdoc-example',
          _owner: 'lipp',
          owner: 'lipp',
          stars: 0,
          url: 'http://github.com/lipp/acme-jsdoc-example',
          git_url: '',
          private: false,
          description: '',
          fork: false,
          synced_at: new Date().getTime()
        })
        repo.save(done)
      })
    })

    beforeEach(function (done) {
      async.series([
        Doclet.createFromGitHubEvent.bind(Doclet, loadGitHubEvent('acme-tag'), []),
        Doclet.findById.bind(Doclet, 'lipp/acme-jsdoc-example/v1.0.11')
      ], function (err, results) {
        assert(!err)
        doclet = results[1]
        assert.equal(doclet.isPublic, true)
        doclet.populate('_repo', done)
      })
    })

    it('.updateIsPublic() from default to false (empty form entry} calls save ', function (done) {
      var form = {}
      var save = sinon.spy(doclet, 'save')
      doclet.updateIsPublic(form, function (err) {
        assert(!err)
        assert(save.calledOnce)
        assert.equal(doclet.isPublic, false)
        done()
      })
    })

    it('.updateIsPublic() from false to false (empty form entry} calls not save ', function (done) {
      var form = {}
      var save = sinon.spy(doclet, 'save')
      doclet.isPublic = false
      doclet.updateIsPublic(form, function (err) {
        assert(!err)
        assert.equal(save.called, false)
        assert.equal(doclet.isPublic, false)
        done()
      })
    })

    it('.updateIsPublic() from true to true calls not save ', function (done) {
      var form = {
        '_public-v1.0.11': 'on'
      }
      var save = sinon.spy(doclet, 'save')
      doclet.updateIsPublic(form, function (err) {
        assert(!err)
        assert.equal(save.called, false)
        assert.equal(doclet.isPublic, true)
        done()
      })
    })

    it('.updateIsPublic() from false to true calls not save ', function (done) {
      var form = {
        '_public-v1.0.11': 'on'
      }
      var save = sinon.spy(doclet, 'save')
      doclet.isPublic = false
      doclet.updateIsPublic(form, function (err) {
        assert(!err)
        assert.equal(save.calledOnce, true)
        assert.equal(doclet.isPublic, true)
        done()
      })
    })

    it('.hasUserAccess() when public is true', function () {
      assert.equal(doclet.hasUserAccess(), true)
    })

    it('.hasUserAccess() when NOT public is false', function () {
      doclet.isPublic = false
      assert.equal(doclet.hasUserAccess(), false)
    })

    it('.hasUserAccess({_id: <owner>}) when NOT public is true', function () {
      doclet.isPublic = false
      assert.equal(doclet.hasUserAccess({accessibleRepos: ['lipp/acme-jsdoc-example']}), true)
    })

    it('.hasUserAccess({_id: <other>}) when NOT public is false', function () {
      doclet.isPublic = false
      assert.equal(doclet.hasUserAccess({accessibleRepos: ['lipp2/acme-jsdoc-example']}), false)
    })
  })
})
