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
    console.log('checking out', repository.html_url, branch)
    var gitDir = repo.checkout(repository.html_url, branch, gitRoot)
    console.log('creating doc', repository.html_url, branch)
    var data = gather.gatherDocletsAndMeta(gitDir)
    console.log('finished doc', repository.html_url, branch)
    Doclet.createFromGitHubEvent(eventData, data, done)
  }

  inbox.process(function (job, jobDone) {
    try {
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
      var refParts = data.ref.split('refs/heads/')
      if (data.ref_type === 'tag') {
        console.log('new release of', data.repository.full_name, data.ref)
        updateDoc(data.repository, data.ref, data, done)
      } else if (refParts) {
        console.log('new release of', data.repository.full_name, refParts[1])
        updateDoc(data.repository, refParts[1], data, done)
      } else {
        jobDone()
      }
    } catch (err) {
      console.log('failed with exception', err)
      jobDone(err)
    }
  })
}

module.exports = {
  init: init
}
