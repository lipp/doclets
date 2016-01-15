var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var exec = require('sync-exec')
var GitHubApi = require('github')
var _ = require('underscore')

var execThrow = function (cmd, options) {
  var ret = exec(cmd, options)
  if (ret.status !== 0) {
    throw new Error(ret.stderr)
  }
}

var githubApi

var github = module.exports.github = function () {
  if (githubApi === undefined) {
    githubApi = new GitHubApi({
      version: '3.0.0',
      // debug: true,
      protocol: 'https',
      host: 'api.github.com',
      timeout: 5000,
      headers: {
        'user-agent': 'doclets'
      }
    })
  }
  return githubApi
}

module.exports.checkout = function (repoUrl, branch, dir) {
  var gitDir = path.join(dir, repoUrl.split('github.com')[1].replace('/', '_'))

  var options = {
    cwd: gitDir
  }
  var reuse

  try {
    fs.statSync(gitDir)
    reuse = true
  } catch (err) {
    reuse = false
  }
  if (reuse) {
    execThrow('git ' + ['checkout', 'master'].join(' '), options)
    execThrow('git ' + ['pull', 'origin'].join(' '), options)
  } else {
    fse.mkdirsSync(gitDir)
    execThrow('git ' + ['clone', repoUrl, './'].join(' '), options)
  }
  execThrow('git ' + ['checkout', branch].join(' '), options)
  return gitDir
}

var hookUrl = 'http://api.doclets.io/github/callback'

var hookConfig = {
  secret: '12345678',
  url: hookUrl,
  'content_type': 'json'
}

module.exports.addHook = function (user, repo, auth, done) {
  getHook(user, repo, auth, function (err, hook) {
    if (err) {
      done(err)
      return
    }
    github().authenticate(auth)
    if (!hook) {
      github().repos.createHook({
        user: user,
        repo: repo,
        name: 'web',
        activate: true,
        events: ['push', 'create'],
        config: hookConfig
      }, done)
    } else {
      github().repos.updateHook({
        user: user,
        repo: repo,
        config: hookConfig,
        id: hook.id,
        name: 'web',
        active: true
      }, done)
    }
  })
}

var getHook = module.exports.getHook = function (user, repo, auth, done) {
  github().authenticate(auth)
  github().repos.getHooks({
    user: user,
    repo: repo,
    per_page: 100
  }, function (err, hooks) {
    if (err) {
      done(err)
      return
    }
    var hook = _.find(hooks, function (hook) {
      return hook.config.url === hookUrl
    })
    done(null, hook)
  })
}

module.exports.removeHook = function (user, repo, auth, hook, done) {
  github().authenticate(auth)
  github().repos.updateHook({
    user: user,
    repo: repo,
    config: hookConfig,
    id: hook.id,
    name: 'web',
    active: false
  }, done)
}

module.exports.getUserRepos = function (user, auth, done) {
  github().authenticate(auth)
  github().repos.getFromUser({
    user: user,
    type: 'owner',
    per_page: 100
  }, done)
}
