/* global describe it before beforeEach after */
var assert = require('assert')
var User = require('../lib/models/user')
var services = require('../lib/services')
var mongoose = require('mongoose')

describe('The user module', function () {
  before(function (done) {
    mongoose.connect('mongodb://' + services.mongodb.host, done)
  })

  after(function (done) {
    mongoose.connection.close(done)
  })

  beforeEach(function (done) {
    User.remove({}, done)
  })

  it('.createFromGitHubPassport creates db entry', function (done) {
    var ghPassport = {token: 'token',
      profile: {
        id: '123',
        username: 'lipp',
        displayName: 'Gerhard',
        _json: {
          email: 'foo@bla.com',
          html_url: 'http://bla.com',
          avatar_url: 'http://avatar.de'
        }
      }
    }
    User.createFromGitHubPassport(ghPassport, function (err) {
      if (err) {
        done(err)
      } else {
        User.findById('lipp', function (err, user) {
          if (err) {
            done(err)
          } else {
            assert.equal(user.passportId, ghPassport.profile.id)
            assert.equal(user.name, ghPassport.profile.displayName)
            assert.equal(user._id, ghPassport.profile.username)
            assert.equal(user.email, ghPassport.profile._json.email)
            assert.equal(user.url, ghPassport.profile._json.html_url)
            assert.equal(user.image, ghPassport.profile._json.avatar_url)
            assert.equal(user.token, ghPassport.token)
            done()
          }
        })
      }
    })
  })
})
