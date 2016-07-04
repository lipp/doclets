var gather = require('../lib/gather')
var structure = require('../lib/structure')
var viewParams = require('../lib/view-params')
var Doclet = require('../lib/models/doclet')
var _ = require('underscore')
var jade = require('jade')
var chokidar = require('chokidar')
var path = require('path')
var branch = require('git-branch')
var express = require('express')
var io = require('socket.io')
var sys = require('sys')
var http = require('http')
var argv = require('optimist').argv

if (argv.h) {
  console.log('-p 3000 -d [dir]')
  sys.exit(0)
}

var app = express()
var server = http.Server(app)
var socket = io(server)
var port = argv.p || 3000
var repoPath = path.resolve(argv.d)
var dbEntry = gather.gatherDocletsAndMeta(repoPath, false, branch.sync(repoPath))

if (dbEntry.error) {
  console.log(dbEntry)
  sys.exit(0)
}

server.listen(port)

var template = jade.compileFile('./views/api.jade')

app.get('/', function (req, res) {
  var doclet = new Doclet({
    data: {
      hot: 'http://localhost:' + port,
      doclets: gather.createDoclets(dbEntry.config, repoPath),
      articles: dbEntry.articles
    }
  })

  res.send(template(_.extend({
    moment: require('moment')
  }, viewParams.getApiParams(doclet), dbEntry, structure, viewParams)))
})

app.use(express.static('assets'))

var watch = path.join(repoPath, dbEntry.config.dir)
console.log('Watching ', watch)
chokidar.watch(watch).on('all', function () {
  socket.emit('change')
})
