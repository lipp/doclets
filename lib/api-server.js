var githubHandler = require('github-webhook-handler')({
  path: '/github/callback',
  secret: '12345678'
})
var express = require('express')
var fse = require('fs-extra')
var repo = require('./repo')
var gather = require('./gather')
var Doclet = require('./models/doclet')
var mongoose = require('mongoose')

var init = function (gitRoot) {
  fse.mkdirsSync(gitRoot)

  var app = express()

  app.use(githubHandler)

  mongoose.connect('mongodb://192.168.99.100')

  var updateDoc = function (repository, branch, eventData) {
    var gitDir = repo.checkout(repository.html_url, branch, gitRoot)
    var data = gather.gatherDocletsAndMeta(gitDir)
    Doclet.createFromGitHubEvent(eventData, data, function (err) {
      if (err) {
        console.log('ard', err)
      } else {
        console.log('doc stored')
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
