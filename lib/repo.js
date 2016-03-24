var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var exec = require('sync-exec')
var GitHubApi = require('github')
var _ = require('underscore')
var env = require('./env')
var async = require('async')

var execThrow = function (cmd, options) {
  var ret = exec(cmd, options)
  console.log(cmd)
  console.log(ret.stdout)
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

module.exports.getUser = function (auth, done) {
  async.parallel([
    function (callback) {
      github().authenticate(auth)
      github().user.get({}, callback)
    }, function (callback) {
      github().authenticate(auth)
      github().user.getOrgs({}, callback)
    }], function (err, results) {
    if (err) {
      done(err)
      return
    }
    done(null, results[0], results[1])
  })
}

module.exports.getOrg = function (org, auth, done) {
  github().authenticate(auth)
  github().orgs.get({org: org}, done)
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
    execThrow('pwd && git ' + ['fetch', '--all'].join(' '), options)
    execThrow('git ' + ['checkout', branch].join(' '), options)
    execThrow('git ' + ['pull', 'origin', branch].join(' '), options)
  } else {
    fse.mkdirsSync(gitDir)
    execThrow('git ' + ['clone', repoUrl, './'].join(' '), options)
    execThrow('git ' + ['checkout', branch].join(' '), options)
  }
  return gitDir
}

module.exports.getRepoEvents = function (user, repo, auth, done) {
  github().authenticate(auth)
  github().events.getFromRepo({
    user: user,
    repo: repo
  }, function (err, events) {
    done(err, events)
  })
}

var hookUrl = 'https://ci.doclets.io/github/callback'
//hookUrl = 'https://dbfab16f.ngrok.io/github/callback'

var hookConfig = {
  secret: env.api.secret,
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
      console.log(hooks)
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

module.exports.hasUserAccess = function (owner, repo, auth, done) {
  var t1 = new Date()
  github().authenticate(auth)
  github().repos.get({
    user: owner,
    repo: repo
  }, function (err, repo) {
    console.log('dt hasUserAccess', new Date() - t1)
    done(err, repo && repo.permissions.admin)
  })
}

module.exports.getUserRepos = function (user, auth, done) {
  github().authenticate(auth)
  github().user.getOrgs({}, function (err, orgs) {
    if (err) {
      done(err)
      return
    }
    var getters = (orgs || []).map(function (org) {
      return function (callback) {
        github().authenticate(auth)
        github().repos.getFromOrg({
          org: org.login,
          per_page: 100
        }, callback)
      }
    })

    getters.push(function (callback) {
      github().authenticate(auth)
      github().repos.getAll({
        per_page: 100
      }, callback)
    })

    async.parallel(getters, function (err, results) {
      if (err) {
        done(err)
        return
      }
      var repos = [].concat.apply([], results)
      repos = _.chain(repos)
        .filter(function (repo) {
          return repo.permissions.admin
        })
        .uniq(function (repo) {
          return repo.full_name
        })
        .value()
      done(null, repos)
    })
  })
}
