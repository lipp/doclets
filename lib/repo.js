var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')
var exec = require('sync-exec')

var execThrow = function (cmd, options) {
  var ret = exec(cmd, options)
  if (ret.status !== 0) {
    throw new Error(ret.stderr)
  }
}

module.exports.checkout = function (repoUrl, branch, dir) {
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
    execThrow('git ' + ['checkout', 'master'].join(' '), options)
    execThrow('git ' + ['pull', 'origin'].join(' '), options)
  } else {
    fse.mkdirsSync(gitDir)
    execThrow('git ' + ['clone', repoUrl, './'].join(' '), options)
  }
  execThrow('git ' + ['checkout', branch].join(' '), options)
  return gitDir
}
