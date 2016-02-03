var mongoose = require('mongoose')
var _ = require('underscore')
var structure = require('../structure')

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
  createdAt: {type: Date, default: Date.now},
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

docletSchema.methods.initUrls = function () {
  structure.addUrlToDoclets(this.data.doclets, this._repo && this._repo.url, this.version)
}

docletSchema.methods.asTree = function () {
  return structure.tree(this.data.doclets)
}

docletSchema.methods.asFlat = function () {
  return structure.flat(this.data.doclets)
}

docletSchema.methods.articleHtml = function (article) {
  article = _.findWhere(this.data.articles, {
    id: article
  })
  return structure.buildArticleHtml(article, this._repo && this._repo.url, this.version)
}

docletSchema.methods.getDescription = function () {
  if (this.data.packageJson && this.data.packageJson.description) {
    return this.data.packageJson.description
  } else if (this._repo) {
    return this._repo.description
  } else {
    return
  }
}

docletSchema.methods.getRepoUrl = function () {
  return '/' + [this.owner, this.repo].join('/')
}

docletSchema.methods.getDocletUrl = function () {
  return '/' + [this.owner, this.repo, this.version].join('/')
}

docletSchema.statics.findByOwner = function (owner, done) {
  Doclet
    .find({owner: owner})
    .populate('_repo')
    .exec(done)
}

var Doclet = mongoose.model('Doclet', docletSchema)

module.exports = Doclet
