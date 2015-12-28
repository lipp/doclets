/* global describe it before */
var assert = require('assert')
var publish = require('../lib/capture-template/publish')
var path = require('path')
var fs = require('fs')

describe('The publish module', function () {
  var data
  before(function () {
    var input = [{
      a: 1,
      undocumented: true
    }, {
      a: 2,
      kind: 'package'
    }, {
      a: 3,
      meta: {
        code: 123
      }
    }]
    var Taffy = require('taffydb').taffy
    var taffyDB = new Taffy(input)
    var filename = path.join(__dirname, 'foo.json')
    publish.publish(taffyDB, {
      destination: filename
    })
    try {
      data = JSON.parse(fs.readFileSync(filename).toString())
      fs.unlink(filename)
    } catch (err) {
      assert(false, err)
    }
  })

  it('creates destination file', function () {
    assert.ok(data)
  })

  it('filters out unwanted data', function () {
    assert.equal(data.length, 1)
  })

  it('data is correct', function () {
    assert.equal(data[0].a, 3)
  })

  it('deletes superfl. fields', function () {
    assert(!data[0].meta.code)
    assert(!data[0].___id)
    assert(!data[0].___s)
  })
})
