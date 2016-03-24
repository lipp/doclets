var mongoose = require('mongoose')
var Repo = require('./repo.js')
var repoModule = require('../repo')
var async = require('async')

var Schema = mongoose.Schema
var userSchema = new Schema({
  _id: String, // lipp
  passportId: String, // 123765
  name: String,
  email: String,
  url: String,
  token: String,
  refreshToken: String,
  image: String,
  company: String,
  location: String,
  bio: String,
  type: String,
  createdAt: Date,
  needsReauth: Boolean,
  orgs: [{name: String, image: String}],
  _accessibleRepos: [{type: String, ref: 'Repo'}],
  accessibleRepos: [String],
  id: Number,
  blog: String
})

userSchema.statics.syncOrCreateOrg = function (org, done) {
  console.log('sync org', org.login)
  User.findOne({id: org.id}, function (err, user) {
    if (err) {
      done(err)
      return
    }
    var nameChanged = user && user._id !== org.login
    if (!user) {
      user = new User({createdAt: new Date()})
    }
    user.url = org.html_url
    user.id = org.id
    user._id = org.login
    user.name = org.name
    user.bio = org.description
    user.email = org.email
    user.image = org.avatar_url
    user.location = org.location
    user.type = 'Organization'
    user.blog = org.blog
    if (nameChanged) {
      console.log('renaming')
      async.series([
        Repo.changeOwner.bind(Repo, user._id, org.login),
        User.remove.bind(User, {id: org.id}),
        user.save.bind(user)
      ], done)
    } else {
      user.save(done)
    }
  })
}

userSchema.statics.createFromGitHubPassport = function (ghPassport, done) {
  var gh = ghPassport.profile._json
  var user = new User({
    createdAt: new Date(),
    _id: ghPassport.profile.username,
    passportId: ghPassport.profile.id,
    name: ghPassport.profile.displayName,
    email: gh.email,
    url: gh.html_url,
    token: ghPassport.token,
    refreshToken: ghPassport.refreshToken,
    image: gh.avatar_url
  })
  user.save(done)
}

userSchema.virtual('auth').get(function () {
  return {type: 'oauth', token: this.token}
})

userSchema.methods.updateFromGitHubPassport = function (ghPassport, done) {
  this.token = ghPassport.token
  this.refreshToken = ghPassport.refreshToken
  this.save(done)
}

userSchema.methods.syncAccessibleRepos = function (done) {
  var user = this
  console.log('syncing repo access user', user._id)
  Repo.sync(user._id, user.auth, function (err, accessibleRepos) {
    if (err) {
      done(err)
      return
    }
    if (user.type === 'Organization') {
      accessibleRepos = accessibleRepos.filter(function (repo) {
        return repo.split('/')[0] === user._id
      })
    }
    user._accessibleRepos = accessibleRepos
    user.accessibleRepos = accessibleRepos
    user.save(done)
  })
}

userSchema.methods.syncOrgs = function (orgs, done) {
  var user = this
  user.orgs = orgs.map(function (org) {
    return {
      name: org.login,
      image: org.avatar_url
    }
  })
  var syncOrgs = orgs.map(function (org) {
    return function (callback) {
      repoModule.getOrg(org.login, user.auth, function (err, org) {
        if (err) {
          done(err)
          return
        }
        User.syncOrCreateOrg(org, callback)
      })
    }
  })
  async.parallel(syncOrgs, function (err) {
    if (err) {
      done(err)
      return
    }
    user.save(done)
  })
}

userSchema.methods.syncDetailsAndOrgs = function (done) {
  var user = this
  repoModule.getUser(user.auth, function (err, ghUser, orgs) {
    if (err) {
      if (err.code === 401) {
        user.needsReauth = true
        done(null, user)
      } else {
        done(err)
      }
    } else {
      var entries = ['email', 'name', 'company', 'blog', 'location', 'bio', 'type']
      entries.forEach(function (entry) {
        user[entry] = ghUser[entry]
      })
      user.needsReauth = false
      user.syncOrgs(orgs, function (err) {
        if (err) {
          done(err)
          return
        }
        user.save(done)
      })
    }
  })
}

userSchema.methods.syncWithGitHub = function (done) {
  var user = this

  async.series([
    function (callback) {
      if (!user.createdAt) {
        user.createdAt = new Date()
        user.save(callback)
      } else {
        callback(null)
      }
    },
    function (callback) {
      if (!user._accessibleRepos || user._accessibleRepos.length === 0) {
        user.syncAccessibleRepos(callback)
      } else {
        callback(null, user)
      }
    },
    function (callback) {
      if (user.type !== 'Organization') {
        user.syncDetailsAndOrgs(callback)
      } else {
        callback()
      }
    }], function (err, results) {
    if (err) {
      done(err)
      return
    }
    done(null, user)
  })
}

var User = mongoose.model('User', userSchema)

module.exports = User
