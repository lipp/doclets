var docWorker = require('../lib/doc-worker')
docWorker.init('./git-root')
console.log('doc-worker started')
process.on('SIGTERM', function () {
  console.log('doc-worker shutdown')
  process.exit(0)
})
