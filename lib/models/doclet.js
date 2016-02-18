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
  doclet.createdAt = new Date(event.head_commit.timestamp)
  return doclet
}

var docletFromCreateTagEvent = function (event) {
  var doclet = {}
  doclet.type = 'tag'
  doclet.version = event.ref
  doclet.tagOrHash = event.ref
  doclet.owner = event.repository.owner.login
  doclet.createdAt = new Date(event.repository.pushed_at)
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
  version: {type: String, required: true}, // v1.0.2 or master
  owner: {type: String, required: true}, // lipp
  repo: {type: String, required: true}, // node-jet
  type: {type: String, required: true}, // tag | branch
  tagOrHash: {type: String, required: true}, // for checkout
  isPublic: {type: Boolean, default: true},
  error: String, // optional if something did go wrong
  _owner: {type: Schema.Types.String, ref: 'User', required: true},
  _repo: {type: Schema.Types.String, ref: 'Repo', required: true},
  createdAt: {type: Date, required: true},
  dataJson: Schema.Types.Mixed // the real doc data
})

docletSchema.virtual('data').get(function () {
  if (!this._data) {
    this._data = JSON.parse(this.dataJson)
  }
  return this._data
})

docletSchema.virtual('data').set(function (data) {
  this.dataJson = JSON.stringify(data)
})

docletSchema.statics.createFromGitHubEvent = function (event, data, done) {
  var obj = docletFromEvent(event, data)
  Doclet.findById(obj._id, function (err, doclet) {
    if (doclet) {
      if (doclet.tagOrHash === obj.tagOrHash) {
        console.log('discarding same hash')
        done(null, doclet)
        return
      } else if (obj.type === 'branch' && obj.createdAt < doclet.createdAt) {
        console.log('discarding older branch')
        done(null, doclet)
        return
      }
      _.each(obj, function (value, key) {
        doclet.set(key, value)
      })
    } else if (err || !doclet) {
      doclet = new Doclet(obj)
    }
    doclet.save(function (err, doclet) {
      if (err) {
        console.log('invalid doclet?', obj, err)
        done(err)
      } else {
        done(null, doclet)
      }
    })
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

docletSchema.methods.shouldToggleIsPublic = function (formBody) {
  var key = '_public-' + this.version
  if (!this.isPublic && formBody[key] === 'on') {
    return true
  }
  if (this.isPublic && formBody[key] === undefined) {
    return true
  }
  return false
}

docletSchema.methods.updateIsPublic = function (formBody, done) {
  if (this.shouldToggleIsPublic(formBody)) {
    this.isPublic = !this.isPublic
    this.save(done)
  } else {
    done()
  }
}

docletSchema.methods.hasUserAccess = function (user) {
  return this.isPublic || (this.owner === (user && user._id))
}

docletSchema.statics.findByOwner = function (owner, done) {
  Doclet
    .find({owner: owner})
    .populate('_repo')
    .exec(done)
}

var Doclet = mongoose.model('Doclet', docletSchema)

module.exports = Doclet
