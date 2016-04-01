var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var exec = require('sync-exec')
var GitHubApi = require('github')
var _ = require('underscore')
var env = require('./env')
var async = require('async')

var execThrow = module.exports.execThrow = function (cmd, options) {
  var ret = exec(cmd, options)
  if (ret.status !== 0) {
    throw new Error(ret.stderr.toString())
  }
  return ret.stdout.trim()
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
  try {
    github().authenticate(auth)
  } catch (err) {
    done(err)
    return
  }
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
    execThrow('git status', options)
    reuse = true
  } catch (err) {
    reuse = false
  }
  if (reuse) {
    var prevUrl = execThrow('git config --get remote.origin.url', options)
    if (prevUrl !== repoUrl) {
      fse.removeSync(gitDir)
      reuse = false
    }
  }

  var count = 0
  var checkout = function () {
    try {
      if (reuse) {
        execThrow('git reset', options)
        execThrow('git checkout .', options)
        execThrow('git clean -fdx', options)
        execThrow('git ' + ['fetch', '--all'].join(' '), options)
        execThrow('git ' + ['checkout', branch].join(' '), options)
        execThrow('git ' + ['pull', 'origin', branch].join(' '), options)
      } else {
        fse.mkdirsSync(gitDir)
        execThrow('git ' + ['clone', repoUrl, './'].join(' '), options)
        execThrow('git ' + ['checkout', branch].join(' '), options)
      }
      return gitDir
    } catch (err) {
      ++count
      /* istanbul ignore if */
      if (err.message && err.message.match(/timed out/) && count < 3) {
        console.log('GitHub timeout retry', count)
        execThrow('sleep 3')
        return checkout()
      } else {
        throw err
      }
    }
  }
  return checkout()
}

module.exports.getRepoEvents = function (user, repo, auth, done) {
  try {
    github().authenticate(auth)
  } catch (err) {
    done(err)
    return
  }
  github().events.getFromRepo({
    user: user,
    repo: repo
  }, function (err, events) {
    done(err, events)
  })
}

var hookUrl = 'https://ci.doclets.io/github/callback'
// hookUrl = 'https://dbfab16f.ngrok.io/github/callback'

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
    try {
      github().authenticate(auth)
    } catch (err) {
      done(err)
      return
    }
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
  try {
    github().authenticate(auth)
  } catch (err) {
    done(err)
    return
  }
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
  try {
    github().authenticate(auth)
  } catch (err) {
    done(err)
    return
  }
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
  try {
    github().authenticate(auth)
  } catch (err) {
    done(err)
    return
  }
  github().repos.get({
    user: owner,
    repo: repo
  }, function (err, repo) {
    console.log('dt hasUserAccess', new Date() - t1)
    done(err, repo && repo.permissions.admin)
  })
}

module.exports.getAuthScopes = function (auth, done) {
  try {
    github().authenticate(auth)
  } catch (err) {
    done(err)
    return
  }
  github().misc.rateLimit({}, function (err, resp) {
    if (err) {
      done(err)
      return
    }
    done(null, resp.meta['x-oauth-scopes'].split(', '))
  })
}

var getAllPages = function (auth, getPage, opts, done) {
  var pages = []
  opts.per_page = 100
  opts.page = 0
  var get = function () {
    try {
      github().authenticate(auth)
    } catch (err) {
      done(err)
      return
    }
    getPage(opts, function (err, result) {
      if (err) {
        done(err)
        return
      }
      pages = pages.concat(result)
      if (result.length === opts.per_page) {
        ++opts.page
        get()
      } else {
        done(null, pages)
      }
    })
  }
  get()
}

module.exports.getUserRepos = function (user, auth, done) {
  try {
    github().authenticate(auth)
  } catch (err) {
    done(err)
    return
  }
  github().user.getOrgs({}, function (err, orgs) {
    if (err) {
      done(err)
      return
    }
    var getters = (orgs || []).map(function (org) {
      return function (callback) {
        var get = github().repos.getFromOrg.bind(github().repos)
        getAllPages(auth, get, {org: org.login}, callback)
      }
    })

    getters.push(function (callback) {
      var get = github().repos.getAll.bind(github().repos)
      getAllPages(auth, get, {}, callback)
    })

    async.parallel(getters, function (err, results) {
      if (err) {
        done(err)
        return
      }
      var repos = [].concat.apply([], results)
      repos = _.chain(repos)
        .filter(function (repo) {
          return !repo.private && repo.permissions.admin
        })
        .uniq(function (repo) {
          return repo.full_name
        })
        .value()
      done(null, repos)
    })
  })
}
