var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var child_process = require('child_process')

module.exports.checkout = function (repoUrl, branch, dir) {
  console.log('checkout', repoUrl, branch)
  var gitDir = path.join(dir, repoUrl.split('github.com')[1].replace('/', '_'))

  var options = {
    cwd: gitDir
  }
  var reuse

  try {
    fs.statSync(gitDir)
    reuse = true
  } catch (err) {
    reuse = false
  }
  if (reuse) {
    console.log('reuse git dir')
    child_process.spawnSync('git', ['checkout', 'master'], options)
    child_process.spawnSync('git', ['pull', 'origin'], options)
  } else {
    console.log('create new git dir')
    fse.mkdirsSync(gitDir)
    child_process.spawnSync('git', ['clone', repoUrl, './'], options)
  }
  child_process.spawnSync('git', ['checkout', branch], options)
  return gitDir
}
