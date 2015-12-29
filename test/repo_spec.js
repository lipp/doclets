/* global describe it after */
var assert = require('assert')
var repo = require('../lib/repo')
var fs = require('fs')
var fse = require('fs-extra')
var path = require('path')

var gitDir = path.join(__dirname, 'here')

describe('The repo module', function () {
  this.slow(10000)

  after(function () {
    fse.removeSync(gitDir)
  })

  it('checkout("http://github.com/lipp/doclets", "master", "./here")', function () {
    var dir = repo.checkout('http://github.com/lipp/doclets', 'master', gitDir)
    assert.ok(dir)
    assert.doesNotThrow(function () {
      fs.readFileSync(path.join(dir, 'README.md'))
    })
  })

  it('checkout("http://github.com/lipp/doclets", "master", "./here") twice', function () {
    var dir = repo.checkout('http://github.com/lipp/doclets', 'master', gitDir)
    assert.ok(dir)
    assert.doesNotThrow(function () {
      fs.readFileSync(path.join(dir, 'README.md'))
    })
  })

  it('checkout("http://github.com/lipp/doclets", "foobla", "./here") throws', function () {
    assert.throws(function () {
      repo.checkout('http://github.com/lipp/doclets', 'foobla', gitDir)
    })
  })
})
