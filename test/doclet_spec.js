/* global describe it before beforeEach after*/
var assert = require('assert')
var Doclet = require('../lib/models/doclet')
var services = require('../lib/services')
var path = require('path')
var fs = require('fs')
var mongoose = require('mongoose')

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
        done()
      })
    })
  })

  it('.createFromGitHubEvent with push event twice updates db entry', function (done) {
    var event = loadGitHubEvent('acme-push')
    Doclet.createFromGitHubEvent(event, 'nodata', function (err) {
      if (err) {
        done(err)
      }
      Doclet.createFromGitHubEvent(loadGitHubEvent('acme-push'), 'moredata', function (err) {
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
          assert.equal(doclet.data, 'moredata')
          done()
        })
      })
    })
  })
})
