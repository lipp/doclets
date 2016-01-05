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

module.exports.addHook = function (user, repo, auth, done) {
  github().authenticate(auth)
  github().repos.createHook({
    user: user,
    repo: repo,
    name: 'web',
    activate: true,
    events: ['push', 'create'],
    config: {
      secret: '12345678',
      url: hookUrl,
      'content_type': 'json'
    }
  }, done)
}

module.exports.removeHook = function (user, repo, auth, done) {
  github().authenticate(auth)
  github().repos.getHooks({
    user: user,
    repo: repo,
    per_page: 100
  }, function (err, hooks) {
    if (err) {
      done(err)
    }
    var hook = _.find(hooks, function (hook) {
      return hook.config.url === hookUrl
    })
    if (hook) {
      github().repos.deleteHook({
        user: user,
        repo: repo,
        id: hook.id
      }, done)
    } else {
      done(null)
    }
  })
}
