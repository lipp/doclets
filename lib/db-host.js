module.exports.get = function () {
  var db = {}
  if (process.env.COUCHDB_DEBUG_URL) {
    var parsed = require('url').parse(process.env.COUCHDB_DEBUG_URL)
    db.protocol = parsed.protocol
    db.host = parsed.host
    db.port = parsed.port
  } else {
    // from docker-compose
    db.port = process.env.COUCHDB_PORT_5984_TCP_PORT
    db.host = 'couchdb'
    db.protocol = 'http:'
  }
  return db
}
