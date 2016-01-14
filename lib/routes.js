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

Routes.prototype.account = function (req, res) {
  Repo.findByUser(req.user._id, {type: 'oauth', token: req.user.token}, function (err, repos) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    }
    var params = viewParams.getAccountParams(repos)
    params.user = req.user
    res.render('account.jade', params)
  })
}

Routes.prototype.accountRepos = function (req, res) {}

Routes.prototype.index = function (req, res) {
  Doclet.find({})
    .limit(10)
    .sort({created_at: -1})
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
    Doclet.find.bind(Doclet, {owner: req.params.user}),
    User.findById.bind(User, req.params.user)
  ], function (err, results) {
    if (err) {
      res.status(500).send('Err ' + err)
      return
    }
    var data = results[0]
    var owner = results[1]
    if (!owner) {
      res.status(404).send('not found')
      return
    }
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
  Doclet
    .find({owner: req.params.user, repo: req.params.repo})
    .populate('_repo')
    .populate('_owner')
    .exec(function (err, doclets) {
      if (err) {
        res.status(500).send('Err ' + err)
        return
      } else if (!doclets || doclets.length === 0) {
        res.status(404).send('not found')
      } else {
        var versions = doclets.map(function (doclet) {
          return viewParams.getApiParams(doclet)
        })
        res.render('versions.jade', {
          owner: versions[0].owner,
          versions: versions,
          user: req.user
        })
      }
    })
}

Routes.prototype.api = function (req, res) {
  var key = [req.params.user, req.params.repo, req.params.version].join('/')
  Doclet
    .findById(key)
    .populate('_repo')
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
    .exec(function (err, doclet) {
      if (err || !doclet) {
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
