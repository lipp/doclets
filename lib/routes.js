var viewParams = require('./view-params')
var _ = require('underscore')
var moment = require('moment')
var async = require('async')

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

Routes.prototype._getRepos = function (req, done) {
  var github = this.github
  var db = this.db
  db.getReposByUser(req.user.profile.username, function (err, repos) {
    if (err || repos.length === 0) {
      github.repos.getFromUser({
        user: req.user.profile.username,
        type: 'owner',
        per_page: 100
      }, function (err, repos) {
        if (err) {
          repos = []
        }
        var i = 0
        _.each(repos, function (repo) {
          repo.docletsEnabled = false
          db.putRepo(repo.full_name, repo, function (err) {
            if (err) {
              console.log('put repo failed', err)
            }
            ++i
            if (i === repos.length) {
              done(null, repos)
            }
          })
        })
      })
    } else {
      done(null, repos)
    }
  })
}

Routes.prototype.account = function (req, res) {
  this._getRepos(req, function (err, repos) {
    if (err) {
      console.log('err no repos for account', err)
      repos = []
    }
    res.render('account.jade', {user: req.user.profile, repos: repos})
  })
}

Routes.prototype.accountRepos = function (req, res) {
  var db = this.db
  this._getRepos(req, function (err, repos) {
    if (err) {
      console.log('err', err)
    }
    async.each(repos, function (repo, done) {
      if (req.body[repo.name] !== '' && !repo.docletsEnabled) {
        repo.docletsEnabled = true
        db.putRepo(repo.full_name, repo, done)
      } else if (req.body[repo.name] === '' && repo.docletsEnabled) {
        repo.docletsEnabled = false
        db.putRepo(repo.full_name, repo, done)
      } else {
        done()
      }
    }, function () {
      res.redirect('/account')
    })
  })
}

Routes.prototype.index = function (req, res) {
  this.db.getNewestModules(10, function (err, data) {
    var doclets = data.map(function (row) {
      return viewParams.getApiParams(row)
    })
    if (err) {
      res.status(500).send('Err ' + err)
      return
    } else {
      res.render('index.jade', {
        doclets: doclets,
        user: req.user && req.user.profile,
        moment: moment
      })
    }
  })
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
  this.db.getModulesByUser(req.params.user, function (err, data) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    }
    var doclets = data.map(function (row) {
      return viewParams.getApiParams(row)
    })
    if (doclets.length === 0) {
      res.status(404).send('not found')
    } else {
      res.render('user.jade', {
        doclets: doclets,
        user: req.user && req.user.profile
      })
    }
  })
}

Routes.prototype.repo = function (req, res) {
  this.db.getVersionsByUserAndRepo(req.params.user, req.params.repo, function (err, data) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    }
    var versions = data.map(function (row) {
      return viewParams.getApiParams(row)
    })
    if (versions.length === 0) {
      res.status(404).send('not found')
    } else {
      res.render('versions.jade', {
        versions: versions,
        user: req.user && req.user.profile
      })
    }
  })
}

Routes.prototype.api = function (req, res) {
  var key = [req.params.user, req.params.repo].join('/')
  this.db.get(key, req.params.version, function (err, data) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    } else {
      var params = viewParams.getApiParams(data)
      params.user = req.user && req.user.profile
      res.render('api.jade', params)
    }
  })
}

Routes.prototype.article = function (req, res) {
  var key = [req.params.user, req.params.repo].join('/')
  this.db.get(key, req.params.version, function (err, data) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    } else {
      var params = viewParams.getArticleParams(data, req.params.article)
      params.user = req.user && req.user.profile
      res.render('article.jade', params)
    }
  })
}

module.exports.Routes = Routes
