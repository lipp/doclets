var apiServer = require('../lib/api-server')
var gitRoot = 'git-root'
var server = apiServer.init(gitRoot)
server.listen(3420)
