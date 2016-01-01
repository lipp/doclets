var githubHandler = require('github-webhook-handler')({
  path: '/github/callback',
  secret: '12345678'
})
var express = require('express')
var fse = require('fs-extra')
var repo = require('./repo')
var gather = require('./gather')
var db = require('./db')

var init = function (gitRoot) {
  fse.mkdirsSync(gitRoot)

  var app = express()

  app.use(githubHandler)

  db.init(function (err) {
    if (err) {
      console.error('db init failed')
      process.exit(1)
    } else {
      console.log('db ready')
    }
  })

  var updateDoc = function (repository, branch, eventData) {
    var gitDir = repo.checkout(repository.html_url, branch, gitRoot)
    var entry = {
      version: '1.0.0',
      date: new Date().toISOString(),
      data: gather.gatherDocletsAndMeta(gitDir, repository.html_url, branch),
      event: eventData
    }

    db.put(repository.full_name, branch, entry, function (err, result) {
      if (err) {
        console.error('db access error', err)
      } else {
        console.log('db access ok')
      }
    })
  }

  githubHandler.on('push', function (event) {
    var data = event.payload
    if (data.ref === 'refs/heads/master') {
      console.log('new release of', data.repository.full_name, 'master')
      updateDoc(data.repository, 'master', data)
    }
  })

  githubHandler.on('create', function (event) {
    var data = event.payload
    if (data.ref_type === 'tag') {
      console.log('new release of', data.repository.full_name, data.ref)
      updateDoc(data.repository, data.ref, data)
    }
  })

  return app
}

module.exports = {
  init: init
}
