var gather = require('../lib/gather')
  , structure = require('../lib/structure')
  , viewParams = require('../lib/view-params')
  , Doclet = require('../lib/models/doclet')
  , _ = require('underscore')
  , jade = require('jade')
  , chokidar = require('chokidar')
  , path = require('path')
  , branch = require('git-branch')
  , express = require('express')
  , io = require('socket.io')
  , http = require('http')
  , argv = require('optimist').argv;

if (argv.h) {
  console.log('-p 3000 -d [dir]');
  return;
}

var app = express()
  , server = http.Server(app)
  , socket = io(server);

server.listen(argv.p || 3000);

var repoPath = path.resolve(argv.d);
var dbEntry = gather.gatherDocletsAndMeta(repoPath, false, branch.sync(repoPath));

if (dbEntry.error) {
  console.log(dbEntry);
  return;
}

app.get('/', function (req, res) {
  res.send(jade.renderFile('./views/api.jade', _.extend({
    doclet: new Doclet({
      data: {
        hot: true,
        doclets: gather.createDoclets(dbEntry.config, repoPath),
        articles: dbEntry.articles
      }
    }),
    moment: require('moment'),
    _: _
  }, dbEntry, structure, viewParams)));
});

app.use(express.static('assets'));

var watch = path.join(repoPath, dbEntry.config.dir);
console.log('Watching ', watch);
chokidar.watch(watch).on('all', function () {
  socket.emit('change');
});
