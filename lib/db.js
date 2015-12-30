/* global emit */
var cradle = require('cradle')
var db

var initDesignDocuments = function () {
  db.save('_design/packages', {
    byUserAndRepo: {
      map: function (doc) {
        if (doc.repo && doc.repo.user && doc.repo.name) {
          emit([doc.repo.user, doc.repo.name], doc)
        }
      }
    },
    byRepo: {
      map: function (doc) {
        if (doc.repo && doc.repo.branch && doc.repo.user && doc.repo.name) {
          emit(doc.repo.name, {
            version: doc.repo.branch,
            packageJson: doc.packageJson,
            user: doc.repo.user
          })
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

var failCount = 0

var init = function (done) {
  var couchhost
  var couchport
  if (process.env.COUCHDB_DEBUG_URL) {
    var parsed = require('url').parse(process.env.COUCHDB_DEBUG_URL)
    couchhost = parsed.protocol + '//' + parsed.host
    couchport = parsed.port
  } else {
    // from docker-compose
    couchport = process.env.COUCHDB_PORT_5984_TCP_PORT
    couchhost = 'http://couchdb'
  }
  console.log('connect', couchhost, couchport)
  db = new (cradle.Connection)(couchhost, couchport, {
    retries: 10,
    retryTimeout: 1000
  }).database('doclets')
  db.exists(function (err, exists) {
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
      done()
    } else {
      db.create()
      initDesignDocuments()
      done()
    /* populate design documents */
    }
  })
}

var put = function (key, branch, data, done) {
  db.save(key + branch, data, done)
}

var get = function (key, branch, done) {
  db.get(key + branch, done)
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
  db.view('packages/byUserAndRepo', {
    startkey: [user, repo],
    endkey: [user, repo]
  }, forwardValues(done))
}

var getModulesByUser = function (user, done) {
  db.view('packages/byUserAndRepo', {
    startkey: [user],
    endkey: [user, '\u9999']
  }, forwardValues(done))
}

var getAllModules = function (done) {
  db.view('packages/byRepo', {}, forwardValues(done))
}

var searchAllModules = function (matchStr, done) {
  db.view('packages/byRepo', {
    startkey: matchStr,
    endkey: matchStr + '\u9999'
  }, forwardValues(done))
}

var getNewestModules = function (limit, done) {
  db.view('packages/byDate', {
    descending: true,
    limit: limit
  }, forwardValues(done))
}

module.exports = {
  init: init,
  put: put,
  get: get,
  getVersionsByUserAndRepo: getVersionsByUserAndRepo,
  getModulesByUser: getModulesByUser,
  getAllModules: getAllModules,
  searchAllModules: searchAllModules,
  getNewestModule: getNewestModules
}
