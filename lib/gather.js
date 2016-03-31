var _ = require('underscore')
var fs = require('fs')
var yaml = require('js-yaml')
var recursiveReadSync = require('recursive-readdir-sync')
var path = require('path')
var uuid = require('uuid')
var pathIsAbsolute = require('path-is-absolute')
var exec = require('sync-exec')
var glob = require('glob')

var changeFilenameFromAbsoluteToRelative = function (doclets, dir) {
  doclets.forEach(function (doclet) {
    if (doclet.kind && doclet.kind !== 'package') {
      try {
        var parts = doclet.meta.path.split(dir)
        delete doclet.meta.path
        delete doclet.meta.vars
        doclet.meta.filename = path.join('./', parts[1] || '', doclet.meta.filename)
      } catch (err) {
        console.log('change to relative filename failed', doclet.longname, err)
        console.log('change to relative filename failed', doclet.longname, doclet.kind)
      }
    }
  })
}

var createDoclets = function (config, workDir) {
  var jsFiles = getFiles(config, workDir)
  if (jsFiles.length < 1) {
    throw new Error('no files')
  }
  var jsdocOptions = jsFiles.map(function (fileName) {
    if (pathIsAbsolute(fileName)) {
      return fileName
    } else {
      return process.cwd() + '/' + fileName
    }
  })
  jsdocOptions.push('-t')
  jsdocOptions.push(__dirname + '/capture-template')
  jsdocOptions.push('-c')
  jsdocOptions.push(__dirname + '/jsdoc.conf')
  var filename = uuid.v1()
  jsdocOptions.push('-d')
  jsdocOptions.push(filename)
  console.log('jsdoc starting')
  var jsdoc = exec(__dirname + '/../node_modules/.bin/jsdoc ' + jsdocOptions.join(' '), {
    cwd: __dirname
  })
  console.log('jsdoc.status ', jsdoc.status === 0 ? 'ok' : 'failed')
  var taffyJson = path.join(__dirname, filename)
  var taffyData = JSON.parse(fs.readFileSync(taffyJson))
  fs.unlink(taffyJson)
  console.log('jsdoc change paths')
  changeFilenameFromAbsoluteToRelative(taffyData, workDir)
  console.log('jsdoc finished')
  return taffyData
}

var isValidPath = function (fileOrDirPath) {
  fileOrDirPath = path.normalize(fileOrDirPath)
  return !path.isAbsolute(fileOrDirPath) && fileOrDirPath.indexOf('../') === -1
}

var getFiles = module.exports.getFiles = function (config, dir) {
  var files = []
  if (config.files) {
    config.files = config.files.map(path.normalize)
    config.files = config.files.filter(isValidPath)
    files = files.concat.apply(files, config.files.map(function (file) {
      if (glob.hasMagic(file)) {
        return glob.sync(file, { cwd: dir, realpath: true })
      }
      return path.join(dir, file)
    }))
  }
  if (config.dir) {
    config.dir = path.normalize(config.dir)
    if (isValidPath(config.dir)) {
      files = files.concat(recursiveReadSync(path.join(dir, config.dir)))
    }
  }
  return files
}

var getArticles = function (config, dir) {
  return _.map(config.articles || [], function (article) {
    var title = _.keys(article)[0]
    var filename = article[title]
    var markdown = fs.readFileSync(path.join(dir, filename)).toString()
    return {
      title: title,
      markdown: markdown,
      id: title.replace(' ', '_').toLowerCase()
    }
  })
}

var createDocletsAndMeta = function (dir, isTag, branch) {
  try {
    var dbEntry = {
      version: '1.0.0',
      type: 'jsdoc'
    }

    dbEntry.config = yaml.safeLoad(fs.readFileSync(path.join(dir, '.doclets.yml')))
    dbEntry.config.branches = dbEntry.config.branches || ['master', 'add-to-doclets']
    if (!isTag && dbEntry.config.branches.indexOf(branch) === -1) {
      dbEntry.ignored = true
      return dbEntry
    }

    var t1 = new Date()
    dbEntry.doclets = createDoclets(dbEntry.config, dir)
    var t2 = new Date()
    dbEntry.perf = {}
    dbEntry.perf.doclets = t2 - t1
    t1 = t2
    if (dbEntry.config.packageJson) {
      dbEntry.packageJson = JSON.parse(fs.readFileSync(path.join(dir, dbEntry.config.packageJson)))
    }
    dbEntry.articles = getArticles(dbEntry.config, dir)
    t2 = new Date()
    dbEntry.perf.articles = t2 - t1
  } catch (err) {
    try {
      dbEntry.error = err.toString()
    } catch (_) {
      dbEntry.error = 'unknown'
    }
  }
  return dbEntry
}

module.exports.gatherDocletsAndMeta = createDocletsAndMeta
module.exports.createDoclets = createDoclets
