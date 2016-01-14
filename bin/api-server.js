var apiServer = require('../lib/api-server')
apiServer.init(3420)
console.log('api-server started')
process.on('SIGTERM', function () {
  console.log('api-server shutdown')
  process.exit(0)
})
