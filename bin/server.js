require('../lib/server').init(8080, function (err) {
  if (err) {
    console.log('failed to start', err)
    process.exit(1)
  } else {
    console.log('running on port 8080')
  }
})
