var fse = require('fs-extra')
var repoModule = require('./repo')
var gather = require('./gather')
var Doclet = require('./models/doclet')
var Repo = require('./models/repo')
require('./models/user') // load User schema
var Bull = require('bull')
var _ = require('underscore')
var mongoose = require('mongoose')
var env = require('./env')
var async = require('async')

var toWebhookEvent = module.exports.toWebhookEvent = function (polledEvent) {
  var whEvent = {}
  whEvent.ref = polledEvent.payload.ref
  whEvent.repository = {
    full_name: polledEvent.repo.name,
    name: polledEvent.repo.name.split('/')[1],
    html_url: 'https://github.com/' + polledEvent.repo.name,
    owner: {}
  }
  if (polledEvent.type === 'PushEvent') {
    whEvent.repository.owner.name = polledEvent.actor.login
    whEvent.after = polledEvent.payload.head
    whEvent.head_commit = {timestamp: polledEvent.created_at}
  } else {
    whEvent.repository.owner.login = polledEvent.actor.login
    whEvent.ref_type = polledEvent.payload.ref_type
    whEvent.repository.pushed_at = polledEvent.created_at
  }
  return whEvent
}

var getLastPushPerBranch = module.exports.getLastPushPerBranch = function (events) {
  var lastPushPerBranch = _.chain(events)
    .filter(function (event) {
      return event.type === 'PushEvent'
    })
    .groupBy(function (event) {
      return event.payload.ref
    })
    .map(function (eventsByRef) {
      return eventsByRef[0]
    })
  return lastPushPerBranch.value()
}

var getTags = module.exports.getTags = function (events) {
  var tags = _.chain(events)
    .filter(function (event) {
      return event.type === 'CreateEvent' && event.payload.ref_type === 'tag'
    })
  return tags.value()
}

var refireRepoEvents = module.exports.refireRepoEvents = function (queue, repo, done) {
  repoModule.getRepoEvents(repo.owner, repo.name, {type: 'oauth', token: repo._owner.token}, function (err, events) {
    if (err) {
      done(err)
    } else {
      getLastPushPerBranch(events).forEach(function (pushEvent) {
        console.log('re-emitting push', repo._id, pushEvent.payload.ref, pushEvent.created_at)
        queue(toWebhookEvent(pushEvent))
      })

      getTags(events).forEach(function (tagEvent) {
        console.log('re-emitting tag', repo._id, tagEvent.payload.ref, tagEvent.created_at)
        queue(toWebhookEvent(tagEvent))
      })

      done()
    }
  })
}

var catchUpRepoEvents = module.exports.catchUpRepoEvents = function (queue, done) {
  done = done || function () {}
  console.log('start catch up')
  Repo.find({'webhook.active': {$eq: true}})
    .populate('_owner')
    .exec(function (err, repos) {
      if (err) {
        console.log('catchup failed', err)
        done(err)
      } else {
        var refireRepoEventsFns = repos.map(function (repo) {
          return refireRepoEvents.bind(null, queue, repo)
        })
        async.parallel(refireRepoEventsFns, done)
      }
    })
}

module.exports.init = function (gitRoot) {
  fse.mkdirsSync(gitRoot)

  var inbox = new Bull('inbox', env.redis.port, env.redis.host)
  var failed = new Bull('failed', env.redis.port, env.redis.host)

  mongoose.connect('mongodb://' + env.mongodb.host + env.mongodb.db, function () {
    inbox.on('ready', function () {
      catchUpRepoEvents(function (data) {
        inbox.add(data, {
          attempts: 20,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        })
      })
    })
  })

  var updateDoc = function (repository, branch, eventData, done) {
    console.log('checking out', repository.html_url, branch)
    var gitDir = repoModule.checkout(repository.html_url, branch, gitRoot)
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
