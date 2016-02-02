var viewParams = require('./view-params')
var moment = require('moment')
var async = require('async')
var _ = require('underscore')
var Doclet = require('./models/doclet')
var User = require('./models/user')
var Repo = require('./models/repo')

var Routes = function () {}

Routes.prototype.login = function (req, res) {
  res.render('login', { user: req.user && req.user.profile })
}

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

Routes.prototype.ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

Routes.prototype.addRepo = function (req, res) {
  var fullname = req.body.repo
  console.log('adding repo', fullname)
  var done = function (err) {
    if (err) {
      req.flash('error', err)
      res.redirect('/' + req.params.user)
    } else {
      req.flash('result', 'Settings applied successfully')
      res.redirect('/' + fullname)
    }
  }
  Repo.findById(fullname, function (err, repo) {
    if (err) {
      done(err)
    } else {
      repo.enableWebHook(done)
    }
  })
}

Routes.prototype.changeRepo = function (req, res) {
  console.log('changing repo', req.body)
  res.status(200).send('')
}

Routes.prototype.index = function (req, res) {
  Doclet.find({})
    .limit(10)
    .sort({createdAt: -1})
    .exec(function (err, doclets) {
      if (err) {
        res.status(500).send('Err ' + err)
        return
      } else {
        doclets = doclets.map(function (doclet) {
          return viewParams.getApiParams(doclet)
        })
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

Routes.prototype.user = function (req, res) {
  async.parallel([
    function (callback) {
      Doclet
        .find({owner: req.params.user})
        .populate('_repo')
        .exec(callback)
    },
    User.findById.bind(User, req.params.user),
    function (callback) {
      if (req.user) {
        Repo.findByUser(req.params.user, {type: 'oauth', token: req.user.token}, req.query.sync, callback)
      } else {
        Repo.find({owner: req.params.user}, callback)
      }
    }
  ], function (err, results) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    }
    var doclets = results[0]
    var owner = results[1]
    var repos = results[2]
    if (!owner) {
      res.status(404).send('not found')
      return
    }
    res.render('user.jade', {
      doclets: doclets,
      user: req.user,
      repos: repos,
      owner: owner,
      username: req.params.user,
      moment: moment,
      _: _
    })
  })
}

Routes.prototype.versions = function (req, res) {
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
    var params = {
      _: _,
      user: req.user,
      owner: req.user || repo._owner,
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
      } else {
        var params = viewParams.getApiParams(doclet)
        params.user = req.user
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
      } else {
        var params = viewParams.getArticleParams(doclet, req.params.article)
        params.user = req.user
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
      done(null, id)
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
