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
  this.changeWebHook(true, done)
}

repoSchema.methods.syncHook = function (auth, done) {
  var self = this
  repoModule.getHook(this.get('owner'), this.get('name'), auth, function (err, hook) {
    if (err) {
      done(err)
      return
    } else {
      self.set('webhook', hook || false)
      self.save(done)
    }
  })
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
    if (repo) {
      repo.set('stars', ghRepo.stargazers_count)
      repo.set('private', ghRepo.private)
      repo.set('description', ghRepo.description || '')
      repo.set('synced_at', new Date().getTime())
      repo.set('permissions', ghRepo.permissions)
      repo.syncHook(auth, done)
    } else if (err || !repo) {
      Repo.createFromGitHub(ghRepo, auth, done)
    }
  })
}

repoSchema.statics.findByUser = function (user, auth, done) {
  repoModule.getUserRepos(user, function (err, ghRepos) {
    if (err) {
      done(err)
      return
    }
    var olds = {}

    var sync = function (done) {
      var syncFns = ghRepos.map(function (ghRepo) {
        return function (done) {
          console.log('sync', ghRepo.full_name)
          delete olds[ghRepo.full_name]
          Repo.syncOrCreate(ghRepo, auth, done)
        }
      })
      async.parallel(syncFns, done)
    }

    var getOlds = function (done) {
      console.log('olds')
      Repo.find({}, function (err, repos) {
        if (err) {
          done(err)
        } else {
          repos.forEach(function (repo) {
            olds[repo._id] = false
          })
          done()
        }
      })
    }

    var removeOlds = Repo.remove.bind(Repo, {_id: {$in: _.keys(olds)}})

    async.series([
      getOlds,
      sync,
      removeOlds
    ], done)
  })
}

var Repo = mongoose.model('Repo', repoSchema)

module.exports = Repo
