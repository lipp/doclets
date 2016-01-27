var mongoose = require('mongoose')
var _ = require('underscore')

var Schema = mongoose.Schema

var docletFromPushBranchEvent = function (event) {
  var branchName = event.ref.match(/refs\/(?:heads|tags)\/(.+)/)
  var doclet = {}
  doclet.type = 'branch'
  doclet.version = branchName && branchName[1]
  doclet.tagOrHash = event.after
  doclet.owner = event.repository.owner.name
  return doclet
}

var docletFromCreateTagEvent = function (event) {
  var doclet = {}
  doclet.type = 'tag'
  doclet.version = event.ref
  doclet.tagOrHash = event.ref
  doclet.owner = event.repository.owner.login
  return doclet
}

var docletFromEvent = function (event, data) {
  var doclet
  if (event.ref_type === 'tag') {
    doclet = docletFromCreateTagEvent(event)
  } else {
    doclet = docletFromPushBranchEvent(event)
  }
  doclet.created_at = new Date().toISOString()
  doclet._owner = doclet.owner
  doclet.repo = event.repository.name
  doclet._repo = event.repository.full_name
  doclet._id = doclet.owner + '/' + doclet.repo + '/' + doclet.version
  doclet.data = data
  return doclet
}

var docletSchema = new Schema({
  _id: String, // lipp/node-jet/v1.0.2
  name: String, // node-jet
  version: String, // v1.0.2
  owner: String, // lipp
  repo: String, // node-jet
  type: String, // tag | branch
  tagOrHash: String, // for checkout
  _owner: {type: Schema.Types.String, ref: 'User'},
  _repo: {type: Schema.Types.String, ref: 'Repo'},
  data: Schema.Types.Mixed // the real doc data
})

docletSchema.statics.createFromGitHubEvent = function (event, data, done) {
  var obj = docletFromEvent(event, data)
  Doclet.findById(obj._id, function (err, doclet) {
    if (doclet) {
      _.each(obj, function (value, key) {
        doclet.set(key, value)
      })
    } else if (err || !doclet) {
      doclet = new Doclet(obj)
    }
    doclet.save(done)
  })
}

var Doclet = mongoose.model('Doclet', docletSchema)

module.exports = Doclet
