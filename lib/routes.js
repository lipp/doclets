var viewParams = require('./view-params')
var moment = require('moment')
var async = require('async')
var _ = require('underscore')
var Doclet = require('./models/doclet')
var User = require('./models/user')
var Repo = require('./models/repo')

var Routes = function () {}

Routes.prototype.authGithub = function () {}

Routes.prototype.authGithubCallback = function (req, res) {
  req.session.save(function () {
    User.findOne({passportId: req.session.passport.user}, function (err, user) {
      if (err) {
        res.status(500).send('Sorry, login failed')
      } else {
        res.redirect('/' + user._id)
      }
    })
  })
}

Routes.prototype.logout = function (req, res) {
  req.session.destroy(function () {
    res.redirect('/')
  })
}

Routes.prototype.reauth = function (req, res) {
  req.session.destroy(function () {
    res.redirect('/auth/github')
  })
}

Routes.prototype.docletsYml = function (req, res) {
  res.render('doclets_yml.jade', {user: req.user, path: 'doclets.yml'})
}

Routes.prototype.ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/')
}

Routes.prototype.badge = function (req, res) {
  var key = [req.params.user, req.params.repo, req.params.version].join('/')
  console.log('badge for', key)
  Doclet.findById(key, function (err, doclet) {
    var label = req.params.version.replace(/\-/g, '--')
    label = label.replace(/_/g, '__')
    label = label.replace(/\s/g, '_')
    if (err || !doclet) {
      res.redirect('https://img.shields.io/badge/API--Doc_' + label + '-error-grey.svg')
      return
    }
    if (doclet.error) {
      res.redirect('https://img.shields.io/badge/API--Doc_' + label + '-failed-red.svg')
      return
    } else {
      res.redirect('https://img.shields.io/badge/API--Doc_' + label + '-ready-green.svg')
      return
    }
  })
}

Routes.prototype.addRepo = function (req, res) {
  var fullname = req.body.repo
  console.log('adding repo', fullname)
  var username = fullname.split('/')[0]

  var done = function (err) {
    if (err) {
      req.flash('error', err)
      res.redirect('/' + username)
    } else {
      res.redirect('/' + fullname)
    }
  }
  async.parallel([
    Repo.findById.bind(Repo, fullname),
    User.findById.bind(User, username)
  ], function (err, results) {
    if (err) {
      done(err)
      return
    }
    var repo = results[0]
    var user = results[1]
    repo.enableWebHook(req.user.auth, function (err) {
      if (err) {
        done(err)
        return
      }
      if (user.type === 'Organization' && !user.token) {
        user.token = req.user.token
        user.refreshToken = req.user.refreshToken
        user.save(done)
        return
      }
      done()
    })
  })
}

Routes.prototype.changeRepo = function (req, res) {
  var fullname = req.query.repo
  async.parallel([
    Doclet.findByFullnames.bind(Doclet, [fullname]),
    Repo.findById.bind(Repo, fullname)
  ], function (err, results) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    } else {
      var doclets = results[0]
      var repo = results[1]
      repo.hasUserAccess(req.user.auth, function (err, hasAccess) {
        if (err) {
          res.status(500).send('Err ' + err)
          return
        }
        if (!hasAccess) {
          req.flash('error', 'No admin access to repository')
          res.redirect('/' + fullname)
          return
        }
        var actions = _.map(doclets, function (doclet) {
          return doclet.updateIsPublic.bind(doclet, req.body)
        })
        actions.push(repo.updateWebHook.bind(repo, req.body, req.user.auth))
        async.parallel(actions, function (err) {
          if (err) {
            req.flash('error', err)
          } else {
            req.flash('result', true)
          }
          res.redirect('/' + fullname)
        })
      })
    }
  })
}

Routes.prototype.index = function (req, res) {
  async.parallel([
    function (callback) {
      Doclet.find({isPublic: true, error: null})
        .limit(12)
        .sort({createdAt: -1})
        .populate('_repo')
        .populate('_owner')
        .exec(callback)
    },
    Doclet.count.bind(Doclet, {}),
    User.count.bind(User, {})
  ], function (err, results) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    } else {
      var doclets = results[0]
      doclets = doclets.map(function (doclet) {
        return viewParams.getApiParams(doclet)
      })
      res.render('index.jade', {
        doclets: doclets,
        docletsCount: results[1],
        usersCount: results[2],
        user: req.user,
        moment: moment,
        path: '/'
      })
    }
  })
}

Routes.prototype.search = function (req, res) {
  var query = req.query.q.toLowerCase()
  Doclet.find({repo: {$regex: new RegExp(query, 'i')}}, function (err, doclets) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    } else {
      res.render('search.jade', {
        doclets: doclets,
        query: query,
        user: req.user
      })
    }
  })
}

Routes.prototype.sync = function (req, res) {
  req.user.syncAccessibleRepos(function (err) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    }
    res.redirect('/' + req.user._id)
  })
}

Routes.prototype.user = function (req, res) {
  User.findById(req.params.user, function (err, user) {
    if (err) {
      res.status(500).send('Err: ' + err)
      return
    }
    if (!user) {
      res.status(404).send('not found')
      return
    }
    async.series([
      function (callback) {
        if (user.type === 'Organization' || (req.user && req.user._id === req.params.user)) {
          user.syncWithGitHub(callback)
        } else {
          callback(err, user)
        }
      },
      function (callback) {
        Doclet.findByFullnames(user.accessibleRepos, callback)
      },
      function (callback) {
        user.populate('_accessibleRepos', callback)
      }], function (err, results) {
      if (err) {
        res.status(500).send('Err ' + err)
        return
      }
      var doclets = results[1]
      doclets = _.filter(doclets, function (doclet) {
        return doclet.hasUserAccess(req.user)
      })
      var owner = results[0]
      var repos = results[2]._accessibleRepos
      res.render('user.jade', {
        doclets: doclets,
        user: req.user,
        repos: repos,
        owner: owner,
        username: req.params.user,
        moment: moment,
        path: '/' + req.params.user,
        _: _
      })
    })
  })
}

Routes.prototype.repo = function (req, res) {
  var fullname = [req.params.user, req.params.repo].join('/')
  async.parallel([
    function (callback) {
      Repo
        .findById(fullname)
        .populate('_owner')
        .exec(callback)
    },
    function (callback) {
      Doclet
        .find({repo: req.params.repo, owner: req.params.user})
        .exec(callback)
    }
  ], function (err, results) {
    if (err) {
      res.status(500).send('Err' + err)
      return
    }
    var repo = results[0]
    var doclets = results[1]
    if (!repo && !req.user) {
      res.status(404).send('not found')
      return
    } else if (!repo && req.user) {
      res.redirect('/' + req.user._id)
      return
    }
    doclets = _.filter(doclets, function (doclet) {
      return doclet.hasUserAccess(req.user)
    })
    var params = {
      _: _,
      user: req.user,
      owner: repo._owner,
      username: req.params.user,
      repo: repo,
      versions: doclets,
      moment: moment,
      error: req.flash('error')[0],
      result: req.flash('result')[0]
    }
    res.render('repo.jade', params)
  })
}

Routes.prototype.users = function (req, res) {
  User.find({}, function (err, users) {
    if (err) {
      res.status(500).send('Err' + err)
      return
    }
    res.render('users.jade', {users: users, user: req.user})
  })
}

Routes.prototype.doclets = function (req, res) {
  Doclet.find({isPublic: true}, function (err, doclets) {
    if (err) {
      res.status(500).send('Err' + err)
      return
    }
    doclets = doclets.map(function (doclet) {
      return viewParams.getApiParams(doclet)
    })
    res.render('doclets.jade', {doclets: doclets, user: req.user, moment: moment})
  })
}

Routes.prototype.api = function (req, res) {
  var key = [req.params.user, req.params.repo, req.params.version].join('/')
  Doclet
    .findById(key)
    .populate('_repo')
    .populate('_owner')
    .exec(function (err, doclet) {
      if (err || !doclet) {
        res.status(500).send('Err ' + err)
        return
      } else if (!doclet.hasUserAccess(req.user)) {
        res.status(404).send('Not public')
        return
      } else {
        var params = viewParams.getApiParams(doclet)
        params.user = req.user
        params.debug = req.query.debug
        params.username = req.params.user
        res.render('api.jade', params)
      }
    })
}

Routes.prototype.article = function (req, res) {
  var key = [req.params.user, req.params.repo, req.params.version].join('/')
  Doclet
    .findById(key)
    .populate('_repo')
    .populate('_owner')
    .exec(function (err, doclet) {
      if (err || !doclet) {
        res.status(500).send('Err ' + err)
        return
      } else if (!doclet.hasUserAccess(req.user)) {
        res.status(404).send('Not public')
        return
      } else {
        var params = viewParams.getArticleParams(doclet, req.params.article)
        params.user = req.user
        params.username = req.params.user
        params._owner = doclet._owner
        res.render('article.jade', params)
      }
    })
}

Routes.prototype.serializeUser = function (ghUser, done) {
  var id = ghUser.profile.id
  User.findOne({passportId: id}, function (err, user) {
    if (err) {
      done(err)
    } else if (!user) {
      User.createFromGitHubPassport(ghUser, function (err) {
        done(err, id)
      })
    } else {
      user.updateFromGitHubPassport(ghUser, function (err) {
        done(err, id)
      })
    }
  })
}

Routes.prototype.createPassportUser = function (accessToken, refreshToken, profile, done) {
  return done(null, {
    profile: profile,
    token: accessToken,
    refreshToken: refreshToken
  })
}

Routes.prototype.deserializeUser = function (id, done) {
  User.findOne({passportId: id}, done)
}

module.exports.Routes = Routes
