var _ = require('underscore')
var db = {}

module.exports.init = function (done) {
  done()
}

module.exports.put = function (key, branch, data, done) {
  db[key + branch] = data
  done()
}

module.exports.get = function (key, branch, done) {
  var entry = db[key + branch]
  done(!entry && 'not found', entry)
}

module.exports.getModulesByUser = function (user, done) {
  var mods = _.filter(db, function (entry, key) {
    return key.indexOf(user) === 0
  })
  done(mods.length === 0 && 'not found', mods)
}

module.exports.getVersionsByUserAndRepo = function (user, repo, done) {
  var mods = _.filter(db, function (entry, key) {
    return key.indexOf(user + '/' + repo) === 0
  })
  done(mods.length === 0 && 'not found', mods)
}
