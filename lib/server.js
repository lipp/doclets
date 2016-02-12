var express = require('express')
var slash = require('express-slash')
var path = require('path')
var passport = require('passport')
var session = require('express-session')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var GitHubStrategy = require('passport-github2').Strategy
var mongoose = require('mongoose')
var env = require('./env')
var morgan = require('morgan')
var helmet = require('helmet')
var flash = require('connect-flash')

var Routes = require('./routes').Routes

var init = function (port, initDone) {
  mongoose.connect('mongodb://' + env.mongodb.host + env.mongodb.db)

  var routes = new Routes()

  passport.serializeUser(routes.serializeUser.bind(routes))
  passport.deserializeUser(routes.deserializeUser.bind(routes))

  passport.use(new GitHubStrategy({
    clientID: env.server.GITHUB_CLIENT_ID,
    clientSecret: env.server.GITHUB_CLIENT_SECRET,
    callbackURL: env.server.authServer + '/auth/github/callback'
  }, routes.createPassportUser.bind(routes)))

  initDone = initDone || function () {}
  var app = express()
  app.enable('strict routing')
  app.use(morgan('dev'))
  app.use(helmet())
  app.use(helmet.hsts({
    maxAge: 10886400000, // Must be at least 18 weeks to be approved by Google
    includeSubDomains: true, // Must be enabled to be approved by Google
    setIf: function () {
      return env.api.secret !== '12345678'
    }
  }))
  app.use(helmet.csp({
    // Specify directives as normal.
    directives: {
      defaultSrc: ["'self'", 'doclets.io'],
      fontSrc: ['fonts.gstatic.com', 'cdnjs.cloudflare.com', 'data:'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'buttons.github.io', 'platform.twitter.com', 'www.google-analytics.com', 'api.github.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'platform.twitter.com', 'buttons.github.io'],
      imgSrc: ["'self'", 'data:', 'syndication.twitter.com', 'www.google-analytics.com'],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
      frameSrc: ['*.youtube.com', '*.twitter.com', 'youtube.com', 'buttons.github.io'],
      childSrc: ['youtube.com'],
      objectSrc: ['*.youtube.com'] // An empty array allows nothing through
    }
  }))
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(methodOverride())
  var RedisStore = require('connect-redis')(session)
  app.use(session({
    secret: env.server.secret,
    store: new RedisStore({host: env.redis.host, port: env.redis.port}),
    saveUninitialized: true,
    resave: false
  }))

  app.use(passport.initialize())
  app.use(passport.session())

  app.use(express.static(path.join(__dirname, '../assets')))
  app.use(flash())
  app.set('view engine', 'jade')
  app.set('views', path.join(__dirname, '../views'))

  var router = express.Router({
    caseSensitive: app.get('case sensitive routing'),
    strict: app.get('strict routing')
  })

  app.use(router)
  app.use(slash())

  router.get('/auth/github',
    passport.authenticate('github', { scope: [ 'user:email', 'write:repo_hook' ] }),
    routes.authGithub.bind(routes))

  router.get('/auth/github/callback',
    passport.authenticate('github', {failureRedirect: '/'}),
    routes.authGithubCallback.bind(routes))

  router.get('/logout', routes.logout.bind(routes))

  var ensureAuthenticated = routes.ensureAuthenticated.bind(routes)

  router.post('/account/addrepo', ensureAuthenticated, routes.addRepo.bind(routes))
  router.post('/account/:repo', ensureAuthenticated, routes.changeRepo.bind(routes))
  router.post('/sync', ensureAuthenticated, routes.sync.bind(routes))

  router.get('/', routes.index.bind(routes))

  router.get('/search', routes.search.bind(routes))

  router.get('/:user', routes.user.bind(routes))

  router.get('/:user/:repo', routes.repo.bind(routes))

  router.get('/:user/:repo/:version', routes.api.bind(routes))

  router.get('/:user/:repo/:version/:article', routes.article.bind(routes))

  app.listen(port, initDone)
}

module.exports.init = init
