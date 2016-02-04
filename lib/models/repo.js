var mongoose = require('mongoose')
var repoModule = require('../repo')
var Schema = mongoose.Schema
var async = require('async')
var _ = require('underscore')

var repoSchema = new Schema({
  _id: String, // lipp/node-jet
  name: String, // node-jet
  owner: String, // enable query by lipp
  _owner: {type: String, ref: 'User'},
  _doclets: [{type: String, ref: 'Doclet'}],
  webhook: {type: Schema.Types.Mixed, default: false},
  synced_at: Number,
  muted: [String],
  stars: Number,
  url: String,
  git_url: String,
  private: Boolean,
  description: String,
  permissions: {
    admin: Boolean,
    push: Boolean,
    pull: Boolean
  }
})

repoSchema.methods.changeWebHook = function (enable, done) {
  var repoVar
  async.waterfall([
    this.populate.bind(this, '_owner'),
    function (repo, callback) {
      repoVar = repo
      var auth = {
        type: 'oauth',
        token: repo._owner.token
      }
      if (enable) {
        repoModule.addHook(repo._owner._id, repo.name, auth, callback)
      } else {
        repoModule.removeHook(repo._owner._id, repo.name, auth, repo.webhook, callback)
      }
    },
    function (hook, callback) {
      repoVar.set('webhook', hook)
      repoVar.save(callback)
    }
  ], done)
}

repoSchema.methods.enableWebHook = function (done) {
  this.changeWebHook(true, done)
}

repoSchema.methods.disableWebHook = function (done) {
  this.changeWebHook(false, done)
}

repoSchema.methods.isWebHookEnabled = function () {
  return this.webhook && this.webhook.active
}

repoSchema.methods.syncHook = function (auth, done) {
  var self = this
  repoModule.getHook(this.get('owner'), this.get('name'), auth, function (err, hook) {
    if (err) {
      done(err)
    } else {
      self.set('webhook', hook || false)
      // this does not work... WHY?
      // self.save(done)
      self.save(function (err, repo) {
        done(err, repo)
      })
    }
  })
}

repoSchema.methods.updateWebHook = function (formData, done) {
  if (formData._enabled === 'on' && !this.isWebHookEnabled()) {
    this.enableWebHook(done)
  } else if (formData._enabled !== 'on' && this.isWebHookEnabled()) {
    this.disableWebHook(done)
  } else {
    done()
  }
}

repoSchema.statics.createFromGitHub = function (ghRepo, auth, done) {
  var repo = new Repo({
    _id: ghRepo.full_name,
    name: ghRepo.name,
    _owner: ghRepo.owner.login,
    owner: ghRepo.owner.login,
    stars: ghRepo.stargazers_count,
    url: ghRepo.html_url,
    git_url: ghRepo.git_url,
    private: ghRepo.private,
    description: ghRepo.description || '',
    fork: ghRepo.fork,
    permissions: ghRepo.permissions,
    synced_at: new Date().getTime()
  })
  repo.syncHook(auth, done)
}

repoSchema.statics.syncOrCreate = function (ghRepo, auth, done) {
  Repo.findById(ghRepo.full_name, function (err, repo) {
    if (err) {
      done(err)
    } else if (repo) {
      repo.set('stars', ghRepo.stargazers_count)
      repo.set('private', ghRepo.private)
      repo.set('description', ghRepo.description || '')
      repo.set('synced_at', new Date().getTime())
      repo.set('permissions', ghRepo.permissions)
      repo.syncHook(auth, done)
    } else {
      Repo.createFromGitHub(ghRepo, auth, done)
    }
  })
}

repoSchema.statics.sync = function (user, auth, done) {
  console.log('syncing repos', user)
  repoModule.getUserRepos(user, auth, function (err, ghRepos) {
    if (err) {
      done(err)
      return
    }
    var olds = {}

    var sync = function (syncDone) {
      var syncFns = ghRepos.map(function (ghRepo) {
        return function (done) {
          delete olds[ghRepo.full_name]
          Repo.syncOrCreate(ghRepo, auth, done)
        }
      })
      async.parallel(syncFns, syncDone)
    }

    var getOlds = function (getOldsDone) {
      async.waterfall([
        Repo.find.bind(Repo, {}),
        async.wrapSync(function (repos) {
          repos.forEach(function (repo) {
            olds[repo._id] = false
          })
        })], getOldsDone)
    }

    var removeOlds = Repo.remove.bind(Repo, {_id: {$in: _.keys(olds)}})

    async.series([
      getOlds,
      sync,
      removeOlds
    ], function (err, results) {
      if (err) {
        done(err)
      } else {
        done(null, results[1])
      }
    })
  })
}

repoSchema.statics.findOrSyncByUser = function (user, auth, done) {
  Repo.find({owner: user}, function (err, repos) {
    if (err && err.message !== 'Not Found') {
      done(err)
    } else if (!repos || repos.length === 0) {
      console.log('no repos for', user)
      Repo.sync(user, auth, done)
    } else {
      done(null, repos)
    }
  })
}

var Repo = mongoose.model('Repo', repoSchema)

module.exports = Repo
