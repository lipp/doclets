var express = require('express')
var env = require('./env')
var Bull = require('bull')
var githubHandler = require('github-webhook-handler')({
  path: '/github/callback',
  secret: env.api.secret
})

module.exports.init = function (port) {
  var app = express()

  app.use(githubHandler)
  var inbox = new Bull('inbox', env.redis.port, env.redis.host)

  githubHandler.on('error', function (error) {
    console.error('invalid event?', error)
  })

  githubHandler.on('push', function (event) {
    var data = event.payload
    if (data.ref.indexOf('refs/heads/') === 0) {
      console.log('pushing to inbox:', data.repository.full_name, data.ref)
      inbox.add(data, {
        attempts: 20,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      })
    }
  })

  githubHandler.on('create', function (event) {
    var data = event.payload
    if (data.ref_type === 'tag') {
      console.log('pushing to inbox', data.repository.full_name, data.ref)
      inbox.add(data)
    }
  })

  app.listen(port)

  return app
}
