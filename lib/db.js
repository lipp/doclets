/* global emit */
var cradle = require('cradle')
var dbHost = require('./db-host').get()
var doclets
var users
var repoSettings

var initDesignDocuments = function () {
  doclets.save('_design/packages', {
    byUserAndRepo: {
      map: function (doc) {
        if (doc.event) {
          var repo = doc.event.repository
          var user = repo.owner.name || repo.owner.login
          emit([user, repo.name], doc)
        }
      }
    },
    byRepo: {
      map: function (doc) {
        if (doc.event) {
          var repo = doc.event.repository
          emit(repo.name, doc)
        }
      }
    },
    byDate: {
      map: function (doc) {
        if (doc.date) {
          emit(doc.date, doc)
        }
      }
    }
  })
}

var initUsers = function (connection) {
  users = connection.database('users')
  users.exists(function (err, exists) {
    if (!err) {
      if (!exists) {
        users.create()
      }
      users.save('_design/users', {
        byUsername: {
          map: function (doc) {
            if (doc.profile && doc.profile.username) {
              emit(doc.profile.username, doc)
            }
          }
        }
      })
    }
  })
}

var initRepoSettings = function (connection) {
  repoSettings = connection.database('repo-settings')
  repoSettings.exists(function (err, exists) {
    if (!err && !exists) {
      repoSettings.create()
      repoSettings.save('_design/repo-settings', {
        byUser: {
          map: function (doc) {
            if (doc.repo && doc.repo.owner) {
              emit(doc.repo.owner.login || doc.repo.owner.name, doc)
            }
          }
        }
      })
    }
  })
}

var failCount = 0

var init = function (done) {
  var couchhost = dbHost.protocol + '//' + dbHost.host
  var connection = new (cradle.Connection)(couchhost, dbHost.port, {
    retries: 10,
    retryTimeout: 1000
  })
  doclets = connection.database('doclets')
  doclets.exists(function (err, exists) {
    if (err) {
      console.log('not connected, error', failCount, err)
      ++failCount
      if (failCount < 10) {
        console.log('reconnecting')
        setTimeout(function () {
          init(done)
        }, 1000)
      } else {
        done(err)
      }
    } else if (exists) {
      initDesignDocuments()
      initUsers(connection)
      initRepoSettings(connection)
      done()
    } else {
      doclets.create()
      initDesignDocuments()
      initRepoSettings(connection)
      done()
    /* populate design documents */
    }
  })
}

var put = function (key, branch, data, done) {
  doclets.save(key + branch, data, done)
}

var get = function (key, branch, done) {
  doclets.get(key + branch, done)
}

var putUser = function (id, data, done) {
  users.save(id, data, done)
}

var getUser = function (id, done) {
  users.get(id, done)
}

var getUserByUsername = function (username, done) {
  users.view('users/byUsername', {
    startkey: username,
    endkey: username
  }, function (err, users) {
    console.log('db', users.length)
    err = err || (users.length !== 1 && 'db error')
    console.log(err)
    done(err, users[0].value)
  })
}

var getRepo = function (fullname, done) {
  repoSettings.get(fullname, done)
}

var putRepo = function (fullname, repo, done) {
  repoSettings.save(fullname, repo, done)
}

var getReposByUser = function (user, done) {
  repoSettings.view('repo-settings/byUser', {
    startkey: user,
    endkey: user
  }, forwardValues(done))
}

var forwardValues = function (done) {
  return function (err, result) {
    if (err) {
      done(err)
    } else {
      var values = []
      result.forEach(function (row) {
        values.push(row)
      })
      done(undefined, values)
    }
  }
}

var getVersionsByUserAndRepo = function (user, repo, done) {
  doclets.view('packages/byUserAndRepo', {
    startkey: [user, repo],
    endkey: [user, repo]
  }, forwardValues(done))
}

var getModulesByUser = function (user, done) {
  doclets.view('packages/byUserAndRepo', {
    startkey: [user],
    endkey: [user, '\u9999']
  }, forwardValues(done))
}

var getAllModules = function (done) {
  doclets.view('packages/byRepo', {}, forwardValues(done))
}

var searchAllModules = function (matchStr, done) {
  doclets.view('packages/byRepo', {
    startkey: matchStr,
    endkey: matchStr + '\u9999'
  }, forwardValues(done))
}

var getNewestModules = function (limit, done) {
  doclets.view('packages/byDate', {
    descending: true,
    limit: limit
  }, forwardValues(done))
}

module.exports = {
  init: init,
  put: put,
  get: get,
  putUser: putUser,
  getUser: getUser,
  getUserByUsername: getUserByUsername,
  putRepo: putRepo,
  getRepo: getRepo,
  getReposByUser: getReposByUser,
  getVersionsByUserAndRepo: getVersionsByUserAndRepo,
  getModulesByUser: getModulesByUser,
  getAllModules: getAllModules,
  searchAllModules: searchAllModules,
  getNewestModules: getNewestModules
}
