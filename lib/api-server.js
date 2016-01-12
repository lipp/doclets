var githubHandler = require('github-webhook-handler')({
  path: '/github/callback',
  secret: '12345678'
})
var express = require('express')
var services = require('./services')
var Bull = require('bull')

var init = function () {
  var app = express()

  app.use(githubHandler)
  var inbox = new Bull('inbox', services.redis.port, services.redis.host)

  githubHandler.on('push', function (event) {
    var data = event.payload
    console.log('pushing to inbox:', data.repository.full_name, data.ref)
    inbox.add(data)
  })

  githubHandler.on('create', function (event) {
    var data = event.payload
    if (data.ref_type === 'tag') {
      console.log('pushing to inbox', data.repository.full_name, data.ref)
      inbox.add(data)
    }
  })

  return app
}

module.exports = {
  init: init
}
