var express = require('express')
var slash = require('express-slash')
var path = require('path')
var passport = require('passport')
var session = require('express-session')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var GitHubStrategy = require('passport-github2').Strategy
var GitHubApi = require('github')
var async = require('async')
var moment = require('moment')

var ConnectCouchDB = require('connect-couchdb')(session)
var viewParams = require('./view-params')
var _ = require('underscore')

var GITHUB_CLIENT_ID = '4a182557b0d459383e55'
var GITHUB_CLIENT_SECRET = '1bc0158227cf2c460a8298816d40c9bd6dc18df7'
// var webhookUrl = 'http://api.doclets.io/github/callback'

var init = function (port, db, initDone) {
  var github = new GitHubApi({
    version: '3.0.0',
    // debug: true,
    protocol: 'https',
    host: 'api.github.com',
    timeout: 5000,
    headers: {
      'user-agent': 'doclets'
    }

  })

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.  However, since this example does not
  //   have a database of user records, the complete GitHub profile is serialized
  //   and deserialized.
  passport.serializeUser(function (user, done) {
    console.log('set', user.profile.id)
    db.putUser(user.profile.id, user, function (err) {
      if (err) {
        console.log('putUser', err)
      }
      done(err, user.profile.id)
    })
  })

  passport.deserializeUser(function (id, done) {
    console.log('des', id)
    db.getUser(id, function (err, user) {
      user = !err && user
      done(null, user)
    })
  })

  passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: 'http://127.0.0.1:8080/auth/github/callback'
  },
    function (accessToken, refreshToken, profile, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {
        return done(null, {profile: profile, token: accessToken})
      })
    }
  ))
  initDone = initDone || function () {}
  var app = express()
  app.enable('strict routing')
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(methodOverride())
  app.use(session({
    secret: 'your secret passphrase',
    store: new ConnectCouchDB({name: 'sessions', host: '192.168.99.100'}),
    saveUninitialized: true,
    resave: false
  }))
  //  app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }))
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize())
  app.use(passport.session())

  app.use(express.static(path.join(__dirname, '../assets')))
  app.set('view engine', 'jade')
  app.set('views', path.join(__dirname, '../views'))

  var router = express.Router({
    caseSensitive: app.get('case sensitive routing'),
    strict: app.get('strict routing')
  })

  app.use(router)
  app.use(slash())

  router.get('/login', function (req, res) {
    res.render('login', { user: req.user && req.user.profile })
  })

  router.get('/auth/github',
    passport.authenticate('github', { scope: [ 'user:email', 'write:repo_hook' ] }),
    function (req, res) {
      // The request will be redirected to GitHub for authentication, so this
      // function will not be called.
    })

  router.get('/auth/github/callback',
    passport.authenticate('github', {failureRedirect: '/login'}),
    function (req, res) {
      req.session.save(function () {
        res.redirect('/')
      })
    })

  router.get('/logout', function (req, res) {
    req.session.destroy(function () {
      res.redirect('/')
    })
  })

  // Simple route middleware to ensure user is authenticated.
  //   Use this route middleware on any resource that needs to be protected.  If
  //   the request is authenticated (typically via a persistent login session),
  //   the request will proceed.  Otherwise, the user will be redirected to the
  //   login page.
  function ensureAuthenticated (req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
    res.redirect('/login')
  }

  var getRepos = function (req, done) {
    console.log('get repos', req.user.profile.username)
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

  router.get('/account', ensureAuthenticated, function (req, res) {
    getRepos(req, function (err, repos) {
      if (err) {
        console.log('err no repos for account', err)
        repos = []
      }
      res.render('account.jade', {user: req.user.profile, repos: repos})
    })
  })

  router.post('/account/repos', ensureAuthenticated, function (req, res) {
    getRepos(req, function (err, repos) {
      console.log('err', err)
      async.each(repos, function (repo, done) {
        if (req.body[repo.name] !== '' && !repo.docletsEnabled) {
          console.log('enable', repo.full_name, repo.docletsEnabled)
          repo.docletsEnabled = true
          db.putRepo(repo.full_name, repo, done)
        } else if (req.body[repo.name] === '' && repo.docletsEnabled) {
          console.log('disable', repo.full_name)
          repo.docletsEnabled = false
          db.putRepo(repo.full_name, repo, done)
        } else {
          done()
        }
      }, function () {
        res.redirect('/account')
      })
    })
  })

  router.get('/', function (req, res) {
    db.getNewestModules(10, function (err, data) {
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
  })

  router.get('/search', function (req, res) {
    var query = req.query.q.toLowerCase()
    db.getAllModules(function (err, data) {
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
  })

  router.get('/:user', function (req, res) {
    db.getModulesByUser(req.params.user, function (err, data) {
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
  })

  router.get('/:user/:repo', function (req, res) {
    db.getVersionsByUserAndRepo(req.params.user, req.params.repo, function (err, data) {
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
  })

  router.get('/:user/:repo/:version', function (req, res) {
    var key = [req.params.user, req.params.repo].join('/')
    db.get(key, req.params.version, function (err, data) {
      if (err) {
        res.status(500).send('Err ' + err)
        return
      } else {
        var params = viewParams.getApiParams(data)
        params.user = req.user && req.user.profile
        res.render('api.jade', params)
      }
    })
  })

  router.get('/:user/:repo/:version/:article', function (req, res) {
    var key = [req.params.user, req.params.repo].join('/')
    db.get(key, req.params.version, function (err, data) {
      if (err) {
        res.status(500).send('Err ' + err)
        return
      } else {
        var params = viewParams.getArticleParams(data, req.params.article)
        params.user = req.user && req.user.profile
        res.render('article.jade', params)
      }
    })
  })

  db.init(function (err) {
    if (err) {
      initDone(err)
    } else {
      app.listen(port, function (err) {
        if (err) {
          initDone(err)
        }
        initDone()
      })
    }
  })
}

module.exports.init = init
