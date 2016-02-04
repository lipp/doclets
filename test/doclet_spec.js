/* global describe it before beforeEach after*/
var assert = require('assert')
var Doclet = require('../lib/models/doclet')
var Repo = require('../lib/models/repo')
var services = require('../lib/services')
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
  before(function () {
    mongoose.connect('mongodb://' + services.mongodb.host)
  })

  after(function () {
    mongoose.connection.close()
  })

  beforeEach(function (done) {
    Doclet.remove({}, done)
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
      Doclet.createFromGitHubEvent.bind(Doclet, event, 'moredata'),
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
          permissions: {admin: true, push: true, pull: true},
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
      assert.equal(doclet.hasUserAccess({_id: 'lipp'}), true)
    })

    it('.hasUserAccess({_id: <other>}) when NOT public is false', function () {
      doclet.isPublic = false
      assert.equal(doclet.hasUserAccess({_id: 'lipp2'}), false)
    })
  })
})
