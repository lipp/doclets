var express = require('express')
var slash = require('express-slash')
var path = require('path')
var passport = require('passport')
var session = require('express-session')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var GitHubStrategy = require('passport-github2').Strategy
var mongoose = require('mongoose')
var services = require('./services')
var morgan = require('morgan')
var flash = require('connect-flash')

var Routes = require('./routes').Routes

var GITHUB_CLIENT_ID = '4a182557b0d459383e55'
var GITHUB_CLIENT_SECRET = '1bc0158227cf2c460a8298816d40c9bd6dc18df7'

var init = function (port, initDone) {
  mongoose.connect('mongodb://' + services.mongodb.host + services.mongodb.db)

  var routes = new Routes()

  passport.serializeUser(routes.serializeUser.bind(routes))
  passport.deserializeUser(routes.deserializeUser.bind(routes))

  passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: 'http://127.0.0.1:8080/auth/github/callback'
  }, routes.createPassportUser.bind(routes)))

  initDone = initDone || function () {}
  var app = express()
  app.enable('strict routing')
  app.use(morgan('dev'))
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(methodOverride())
  var RedisStore = require('connect-redis')(session)
  app.use(session({
    secret: 'your secret passphrase',
    store: new RedisStore({host: services.redis.host, port: services.redis.port}),
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

  router.get('/login', routes.login.bind(routes))

  router.get('/auth/github',
    passport.authenticate('github', { scope: [ 'user:email', 'write:repo_hook' ] }),
    routes.authGithub.bind(routes))

  router.get('/auth/github/callback',
    passport.authenticate('github', {failureRedirect: '/login'}),
    routes.authGithubCallback.bind(routes))

  router.get('/logout', routes.logout.bind(routes))

  var ensureAuthenticated = routes.ensureAuthenticated.bind(routes)

  router.get('/account', ensureAuthenticated, routes.account.bind(routes))

  router.get('/account/:repo', ensureAuthenticated, routes.getAccountRepo.bind(routes))
  router.post('/account/:repo', ensureAuthenticated, routes.setAccountRepo.bind(routes))

  router.get('/', routes.index.bind(routes))

  router.get('/search', routes.search.bind(routes))

  router.get('/howto', routes.howto.bind(routes))

  router.get('/:user', routes.user.bind(routes))

  router.get('/:user/:repo', routes.versions.bind(routes))

  router.get('/:user/:repo/:version', routes.api.bind(routes))

  router.get('/:user/:repo/:version/:article', routes.article.bind(routes))

  app.listen(port, initDone)
}

module.exports.init = init
