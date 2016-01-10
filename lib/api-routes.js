var fse = require('fs-extra')
var repoModule = require('./repo')
var gather = require('./gather')
var db = require('./db')
var Doclets = require('./models/doclets')
var path = require('path')
var fs = require('fs')
var yaml = require('js-yaml')

var ApiRoutes = function (gitRoot) {
  fse.mkdirsSync(gitRoot)
  this.gitRoot = gitRoot
}

var repoBase = function (repo) {
  return {
    full_name: repo.full_name,
    private: repo.private,
    fork: repo.fork,
    url: repo.html_url,
    git_url: repo.git_url,
    description: repo.description,
    stars: repo.stargazers_count
  }
}

var repoFromPushBranchEvent = function (event) {
  var branchName = event.ref.match(/refs\/(?:heads|tags)\/(.+)/)
  var erepo = event.repository
  var repo = repoBase(erepo)
  repo.type = 'branch'
  repo.name = branchName && branchName[1]
  repo.ref = event.ref
  repo.tagOrHash = event.after
  repo.owner = erepo.owner.name
  return repo
}

var repoFromCreateTagEvent = function (event) {
  var erepo = event.repository
  var repo = repoBase(erepo)
  repo.type = 'tag'
  repo.name = event.ref
  repo.ref = event.ref
  repo.tagOrHash = event.ref
  repo.owner = erepo.owner.login
  return repo
}

var repoFromGitHubEvent = module.exports.repoFromGitHubEvent = function (event) {
  if (event.ref_type === 'tag') {
    return repoFromCreateTagEvent(event)
  } else {
    return repoFromPushBranchEvent(event)
  }
}

ApiRoutes.prototype.createDoclet = function (repo, dir, done) {
  var doclet = {
    version: '1.0.0',
    date: new Date().toISOString(),
    data: gather.gatherDocletsAndMeta(dir),
    repo: repo
  }

  db.put(doclet, done)
}

ApiRoutes.prototype.isBlocked = function (config, repo) {
  return false
}

ApiRoutes.prototype.onPush = function (event) {
  event = event.payload
  var repo = repoFromGitHubEvent(event)
  var dir = repoModule.checkout(repo.url, repo.tagOrHash, this.gitRoot)
  var config = yaml.safeLoad(fs.readFileSync(path.join(dir, '.doclets.yml')))
  if (this.isBlocked(config, repo)) {
    return
  } else {
    this.createDoclet(repo, dir, function (err) {
      if (err) {
        console.error('createDoclet failed', err)
      }
    })
  }
}

ApiRoutes.prototype.onCreate = function (event) {
  if (event.payload.ref_type === 'tag') {
    this.onPush(event)
  }
}
