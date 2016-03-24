var mongoose = require('mongoose')
var repoModule = require('../repo')
var Schema = mongoose.Schema
var async = require('async')

var repoSchema = new Schema({
  _id: String, // lipp/node-jet
  name: String, // node-jet
  owner: String, // enable query by lipp
  githubId: Number,
  _owner: {type: String, ref: 'User'},
  _doclets: [{type: String, ref: 'Doclet'}],
  webhook: {type: Schema.Types.Mixed, default: false},
  synced_at: Number,
  muted: [String],
  stars: Number,
  url: String,
  git_url: String,
  private: Boolean,
  description: String
})

repoSchema.methods.changeWebHook = function (enable, auth, done) {
  var repoVar
  var repo = this
  async.waterfall([
    function (callback) {
      repoVar = repo
      if (enable) {
        repoModule.addHook(repo.owner, repo.name, auth, callback)
      } else {
        repoModule.removeHook(repo.owner, repo.name, auth, repo.webhook, callback)
      }
    },
    function (hook, callback) {
      repoVar.set('webhook', hook)
      repoVar.save(callback)
    }
  ], done)
}

repoSchema.methods.enableWebHook = function (auth, done) {
  this.changeWebHook(true, auth, done)
}

repoSchema.methods.disableWebHook = function (auth, done) {
  this.changeWebHook(false, auth, done)
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

repoSchema.methods.updateWebHook = function (formData, auth, done) {
  if (formData._enabled === 'on' && !this.isWebHookEnabled()) {
    this.enableWebHook(auth, done)
  } else if (formData._enabled !== 'on' && this.isWebHookEnabled()) {
    this.disableWebHook(auth, done)
  } else {
    done(null, this)
  }
}

repoSchema.methods.hasUserAccess = function (auth, done) {
  repoModule.hasUserAccess(this.owner, this.name, auth, done)
}

repoSchema.statics.createFromGitHub = function (ghRepo, auth, done) {
  var repo = new Repo({
    _id: ghRepo.full_name,
    name: ghRepo.name,
    _owner: ghRepo.owner.login,
    owner: ghRepo.owner.login,
    githubId: ghRepo.id,
    stars: ghRepo.stargazers_count,
    url: ghRepo.html_url,
    git_url: ghRepo.git_url,
    private: ghRepo.private,
    description: ghRepo.description || '',
    fork: ghRepo.fork,
    synced_at: new Date().getTime()
  })
  repo.syncHook(auth, done)
}

repoSchema.statics.syncOrCreate = function (ghRepo, auth, done) {
  Repo.findById(ghRepo.full_name, function (err, repo) {
    if (err) {
      done(err)
    } else if (repo) {
      repo.stars = ghRepo.stargazers_count
      repo.private = ghRepo.private
      repo.description = ghRepo.description || ''
      repo.synced_at = new Date().getTime()
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

    var syncFns = ghRepos.map(function (ghRepo) {
      return Repo.syncOrCreate.bind(Repo, ghRepo, auth)
    })

    var repoFullnames = ghRepos.map(function (repo) {
      return repo.full_name
    })

    async.parallel(syncFns, function (err) {
      if (err) {
        done(err)
        return
      }
      done(null, repoFullnames)
    })
  })
}

repoSchema.statics.changeOwner = function (prevOwner, newOwner, done) {
  console.log('renaming', prevOwner, newOwner)
  Repo.find({owner: prevOwner}, function (err, repos) {
    if (err) {
      done(err)
      return
    }
    var actions = repos.map(function (repo) {
      return function (callback) {
        var newRepo = new Repo(repo)
        var newId = newOwner + '/' + repo.name
        console.log('rename', repo._id, 'to', newId)
        newRepo.owner = newOwner
        newRepo._owner = newOwner
        newRepo._id = newId
        newRepo.save(callback)
      }
    })
    async.parallel(actions, function (err) {
      if (err) {
        done(err)
        return
      }
      Repo.remove({owner: prevOwner}, done)
    })
  })
}

var Repo = mongoose.model('Repo', repoSchema)

module.exports = Repo
