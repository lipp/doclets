var fse = require('fs-extra')
var repo = require('./repo')
var gather = require('./gather')
var Doclet = require('./models/doclet')
var Bull = require('bull')
var mongoose = require('mongoose')
var services = require('./services')

var init = function (gitRoot) {
  fse.mkdirsSync(gitRoot)

  mongoose.connect('mongodb://' + services.mongodb.host + services.mongodb.db)

  var inbox = new Bull('inbox', services.redis.port, services.redis.host)
  var failed = new Bull('failed', services.redis.port, services.redis.host)

  var updateDoc = function (repository, branch, eventData, done) {
    var gitDir = repo.checkout(repository.html_url, branch, gitRoot)
    var data = gather.gatherDocletsAndMeta(gitDir)
    Doclet.createFromGitHubEvent(eventData, data, done)
  }

  inbox.process(function (job, jobDone) {
    var data = job.data
    var done = function (err, result) {
      if (err) {
        console.error('doc failed', err, data.repository.full_name, data.ref)
        failed.add(job.data)
        jobDone(err)
      } else {
        console.log('doc created', data.repository.full_name, data.ref)
        jobDone()
      }
    }
    if (data.ref_type === 'tag') {
      console.log('new release of', data.repository.full_name, data.ref)
      updateDoc(data.repository, data.ref, data, done)
    } else if (data.ref === 'refs/heads/master') {
      console.log('new release of', data.repository.full_name, 'master')
      updateDoc(data.repository, 'master', data, done)
    }
  })
}

module.exports = {
  init: init
}
