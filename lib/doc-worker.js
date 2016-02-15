var fse = require('fs-extra')
var repo = require('./repo')
var gather = require('./gather')
var Doclet = require('./models/doclet')
var Repo = require('./models/repo')
var Bull = require('bull')
var mongoose = require('mongoose')
var env = require('./env')

module.exports.catchUp = function (done) {
	done = done || function() {}
	Repo.find({'webhook.active': {$eq: true}})
 		.populate('_owner')
		.exec(function(err, repos) {
			if (err) {
				console.log('catchup failed', err)
				done(err)
				return
			} else {
				repos.forEach(function(repo) {
					repo.getRepoEvents(repo.owner, repo.name, repo._owner.token, function(err, events) {
						if (err) {
							console.log('catchup failed', err)
							done(err)
							return
						} else {
    					var pushes = _.chain(events)
   					   .filter(function (event) {
   					     return event.type === 'PushEvent'
   					   })
   					   .groupBy(function (event) {
   					     return event.payload.ref
   					   })
   					   .map(function (eventsByRef) {
   					     return eventsByRef[1]
   					   })
   					   .value()

   					 var tags = _.chain(events)
   					   .filter(function (event) {
   					     return event.type === 'CreateEvent' && event.payload.ref_type === 'tag'
   					   })
   					   .value()
						}
					})

     */
}

module.exports.init = function (gitRoot) {
  fse.mkdirsSync(gitRoot)

  mongoose.connect('mongodb://' + env.mongodb.host + env.mongodb.db)

  var inbox = new Bull('inbox', env.redis.port, env.redis.host)
  var failed = new Bull('failed', env.redis.port, env.redis.host)

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
          console.error('doc failed', err, data.repository && data.repository.full_name, data.ref)
          failed.add(job.data)
          jobDone(err)
        } else {
          console.log('doc created', data.repository.full_name, data.ref)
          jobDone()
        }
      }
      var refParts = data.ref.split('refs/heads/')
      var branch = refParts && refParts[1]
      if (data.ref_type === 'tag') {
        console.log('new release of', data.repository.full_name, data.ref)
        updateDoc(data.repository, data.ref, data, done)
      } else if (branch) {
        console.log('new release of', data.repository.full_name, branch)
        updateDoc(data.repository, branch, data, done)
      } else {
        console.log('skipping', data.repository.full_name, data.ref)
        jobDone()
      }
    } catch (err) {
      console.log('failed with exception', err)
      failed.add(job.data)
      jobDone(err)
    }
  })
}
