var fs = require('fs')
var path = require('path')
var request = require('request')
var mongoose = require('mongoose')
var User = require('../lib/models/user')
var Repo = require('../lib/models/repo')
var Doclet = require('../lib/models/doclet')

mongoose.connect('mongodb://192.168.99.100/app', function () {
  User.remove({})
  Repo.remove({})
  Doclet.remove({}, function (err, res) {
    console.log(err, res)
    var replayGitHubEvent = function (eventDir, done) {
      var payload = fs.readFileSync(path.join(__dirname, '../fixtures/events', eventDir, 'payload.json'))
      var headers = require(path.join(__dirname, '../fixtures/events', eventDir, 'headers.js'))
      request({
        url: 'http://192.168.99.100:3420/github/callback',
        method: headers.method,
        body: payload,
        headers: headers
      }, function () {})
    }

    var x = ['acme-push', 'acme-tag', 'numbers-push', 'noderestify-push', 'shouldjs-push', 'redux-push', 'commander-push', 'RxJs', 'pixi.js', 'strman']

    x.forEach(function (event) {
      console.log(event)
      replayGitHubEvent(event)
    })
  })
})
