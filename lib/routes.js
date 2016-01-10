var viewParams = require('./view-params')
var moment = require('moment')
var async = require('async')
var _ = require('underscore')
var repoModule = require('./repo')
var Doclet = require('./models/doclet')
var User = require('./models/user')

var Routes = function (db, github) {
  this.db = db
  this.github = github || require('./repo').github()
}

Routes.prototype.login = function (req, res) {
  res.render('login', { user: req.user && req.user.profile })
}

Routes.prototype.authGithub = function () {}

Routes.prototype.authGithubCallback = function (req, res) {
  req.session.save(function () {
    res.redirect('/')
  })
}

Routes.prototype.logout = function (req, res) {
  req.session.destroy(function () {
    res.redirect('/')
  })
}

Routes.prototype.ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

Routes.prototype._updateRepoSetting = function (repoSettings, repo, user, token, done) {
  var fullname = user + '/' + repo.name
  var repoSetting = _.findWhere(repoSettings, {_id: fullname})
  var isOld = repoSetting && true
  var db = this.db
  repoSetting = repoSetting || {}
  repoModule.getHook(user, repo.name, {
    type: 'oauth',
    token: token
  }, function (err, hook) {
    if (err) {
      done(err)
      return
    }
    repoSetting.repo = repo
    repoSetting.hook = hook
    repoSetting.docletsEnabled = hook && hook.active
    repoSetting.muted = repoSetting.muted || []
    if (!isOld) {
      repoSettings.push(repoSetting)
    }
    db.putRepo(repo.full_name, repoSetting, done)
  })
}

Routes.prototype._getRepos = function (req, sync, done) {
  var user = req.user._id
  var self = this
  this.db.getReposByUser(user, function (err, repoSettings) {
    if (sync || err || repoSettings.length === 0) {
      repoModule.getUserRepos(user, function (err, repos) {
        if (err) {
          done(err)
          return
        }
        var putRefreshedRepos = repos.map(function (repo) {
          return self._updateRepoSetting.bind(self, repoSettings, repo, user, req.user.token)
        })

        async.parallel(putRefreshedRepos, function (err) {
          if (err) {
            console.log('refresh repos had error', err)
          }
          done(null, repoSettings)
        })
      })
    } else {
      done(null, repoSettings)
    }
  })
}

Routes.prototype.account = function (req, res) {
  async.parallel([
    this._getRepos.bind(this, req, req.query.sync),
    this.db.getModulesByUser.bind(this.db, req.user._id)
  ], function (err, results) {
    if (err) {
      console.log('err no repos for account', err)
      results[0] = []
    }
    var repoSettings = results[0]
    var modulesByUser = results[1]
    var params = viewParams.getAccountParams(repoSettings, modulesByUser)
    params.user = req.user
    res.render('account.jade', params)
  })
}

Routes.prototype.accountRepos = function (req, res) {
  this._getRepos(req, req.query.sync, function (err, repoSettings) {
    if (err) {
      console.log('err', err)
    }
    var user = req.user.profile.username
    async.each(repoSettings, function (repoSetting, done) {
      var repo = repoSetting.repo
      if (req.body[repo.name] !== '' && !repoSetting.docletsEnabled) {
        console.log('add ', repo.name, req.body[repo.name])
        repoModule.addHook(user, repo.name, {
          type: 'oauth',
          token: req.user.token
        }, done)
      } else if (req.body[repo.name] === '' && repoSetting.docletsEnabled) {
        console.log('remove ', repo.name, req.body[repo.name])
        repoModule.removeHook(user, repo.name, {
          type: 'oauth',
          token: req.user.token
        }, repoSetting.hook, done)
      } else {
        done()
      }
    }, function (err) {
      if (err) {
        console.log('change repos failed', err)
      }
      res.redirect('/account?sync=true')
    })
  })
}

Routes.prototype.index = function (req, res) {
  Doclet.find({})
    .limit(10)
    .sort({created_at: -1})
    .exec(function (err, doclets) {
      doclets = doclets.map(function (doclet) {
        return viewParams.getApiParams(doclet)
      })
      if (err) {
        res.status(500).send('Err ' + err)
        return
      } else {
        res.render('index.jade', {
          doclets: doclets,
          user: req.user,
          moment: moment
        })
      }
    })
}

Routes.prototype.howto = function (req, res) {
  res.render('howto.jade')
}

Routes.prototype.search = function (req, res) {
  var query = req.query.q.toLowerCase()
  this.db.getAllModules(function (err, data) {
    var doclets = data.filter(function (row) {
      var fullName = row.event.repository.full_name.toLowerCase()
      return fullName.indexOf(query) !== -1
    }).map(function (row) {
      return viewParams.getApiParams(row)
    })
    if (err) {
      res.status(500).send('Err ' + err)
      return
    } else {
      res.render('search.jade', {
        doclets: doclets,
        query: query,
        user: req.user && req.user.profile
      })
    }
  })
}

Routes.prototype.user = function (req, res) {
  async.parallel([
    Doclet.find.bind(Doclet, {owner: req.params.user}),
    User.findById.bind(User, req.params.user)
  ], function (err, results) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    }
    var data = results[0]
    var owner = results[1]
    var doclets = data.map(function (row) {
      return viewParams.getApiParams(row)
    })
    res.render('user.jade', {
      doclets: doclets,
      user: req.user,
      owner: owner,
      _: _
    })
  })
}

Routes.prototype.repo = function (req, res) {
  Doclet.find({owner: req.params.user, repo: req.params.repo}, function (err, doclets) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    }
    var versions = doclets.map(function (doclet) {
      return viewParams.getApiParams(doclet)
    })
    if (versions.length === 0) {
      res.status(404).send('not found')
    } else {
      res.render('versions.jade', {
        versions: versions,
        user: req.user
      })
    }
  })
}

Routes.prototype.api = function (req, res) {
  var key = [req.params.user, req.params.repo, req.params.version].join('/')
  Doclet.findById(key, function (err, doclet) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    } else {
      var params = viewParams.getApiParams(doclet)
      params.user = req.user
      res.render('api.jade', params)
    }
  })
}

Routes.prototype.article = function (req, res) {
  var key = [req.params.user, req.params.repo, req.params.version].join('/')
  Doclet.findById(key, function (err, doclet) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    } else {
      var params = viewParams.getArticleParams(doclet, req.params.article)
      params.user = req.user
      res.render('article.jade', params)
    }
  })
}

module.exports.Routes = Routes
