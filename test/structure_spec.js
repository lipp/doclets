/* global describe it beforeEach before */
var assert = require('assert')
var structure = require('../lib/structure')
var gather = require('../lib/gather')
var path = require('path')
var _ = require('underscore')

describe('The structure module', function () {
  it('removeInvalidContent removes null content of params, properties and returns', function () {
    var doclet = {}
    var fields = ['params', 'properties', 'returns']
    fields.forEach(function (field) {
      doclet[field] = [1, null, 2]
      structure.removeInvalidContent(doclet)
      assert.deepEqual(doclet[field], [1, 2])
      doclet[field] = [null]
      structure.removeInvalidContent(doclet)
      assert(!doclet[field])
    })
  })

  describe('unflattenParams', function () {
    var doclet = {}
    var nestedParams
    beforeEach(function () {
      doclet.params = [
        {
          name: 'first',
          description: 'first param'
        },
        {
          name: 'second',
          description: 'second param'
        },
        {
          name: 'second.sub',
          description: 'sub param'
        },
        {
          name: 'second.sub.x',
          description: 'sub x param'
        },
        {
          name: 'second.sub.y',
          description: 'sub y param'
        },
        {
          name: 'second.sub.y[].asd',
          description: 'sub y sub array param'
        },
        {
          name: 'second.sub.z[].asd',
          description: 'sub z auto sub array param'
        },
        {
          name: 'second.sub.zauto.object',
          description: 'auto'
        }
      ]
      structure.unflattenParams(doclet)
      nestedParams = doclet.nestedParams
    })

    it('returns array (on first level)', function () {
      assert.equal(nestedParams.length, 2)
      assert.equal(nestedParams[0].__name, 'first')
      assert.equal(nestedParams[0].__content.description, 'first param')
      assert.equal(nestedParams[1].__name, 'second')
      assert.equal(nestedParams[1].__content.description, 'second param')
    })

    it('structure.childs(result[1]) gives childs', function () {
      var childs = structure.childs(nestedParams[1])
      assert.equal(childs.length, 1)
      assert.equal(childs[0].name, 'sub')
      assert.equal(childs[0].node.__name, 'second.sub')
    })

    it('structure.childs(child[0].node) gives childs of child', function () {
      var childs = structure.childs(nestedParams[1])
      var subChilds = structure.childs(childs[0].node)
      assert.equal(subChilds.length, 4)
      assert.equal(subChilds[0].name, 'x')
      assert.equal(subChilds[0].node.__name, 'second.sub.x')
      assert.equal(subChilds[1].name, 'y')
      assert.equal(subChilds[1].node.__name, 'second.sub.y')
      assert.equal(subChilds[2].name, 'z')
      assert.equal(subChilds[2].node.__name, 'second.sub.z')
      assert.equal(subChilds[2].node.__content.type.names[0], 'Array')
      assert.equal(subChilds[3].name, 'zauto')
      assert.equal(subChilds[3].node.__name, 'second.sub.zauto')
      assert.equal(subChilds[3].node.__content.type.names[0], 'Object')
    })

    it('structure.childs(arrayNode) gives child', function () {
      var childs = structure.childs(nestedParams[1])
      var subChilds = structure.childs(childs[0].node)
      var arrayChilds = structure.childs(subChilds[1].node)
      assert.equal(arrayChilds.length, 1)
      assert.equal(arrayChilds[0].name, 'asd')
      assert.equal(arrayChilds[0].node.__name, 'second.sub.y.asd')
    })
  })

  it('normalizeSeeTag("foo")', function () {
    assert.equal(structure.normalizeSeeTag('foo'), '{@link foo}')
  })

  it('normalizeSeeTag("{@link bla}")', function () {
    assert.equal(structure.normalizeSeeTag('{@link bla}'), '{@link bla}')
  })

  it('.createLink("https://bla.com")', function () {
    assert.equal(structure.createLink('https://bla.com'), "<a href='https://bla.com'>bla.com</a>")
  })

  it('.createLink("https://bla.com/asd")', function () {
    assert.equal(structure.createLink('https://bla.com/asd'), "<a href='https://bla.com/asd'>bla.com/asd</a>")
  })

  it('.createLink("https://bla.com", "BLA")', function () {
    assert.equal(structure.createLink('https://bla.com', 'BLA'), "<a href='https://bla.com'>BLA</a>")
  })

  it('.createLink("foo#bar")', function () {
    assert.equal(structure.createLink('foo#bar'), "<a href='#dl-foo-bar'>foo#bar</a>")
  })

  it('.createLink("foo#bar", "FOO")', function () {
    assert.equal(structure.createLink('foo#bar', 'FOO'), "<a href='#dl-foo-bar'>FOO</a>")
  })

  it('replaceInlineLinks("bla [foo]{@link https://google.com} pp"', function () {
    var str = structure.replaceInlineLink('bla [foo]{@link https://google.com} pp')
    assert.equal(str, "bla <a href='https://google.com'>foo</a> pp")
  })

  it('replaceInlineLinks("bla {@link module:heavy~Tool | Tool} pp"', function () {
    var str = structure.replaceInlineLink('bla {@link module:heavy~Tool | Tool} pp')
    assert.equal(str, "bla <a href='#dl-module-heavy-Tool'>Tool</a> pp")
  })

  it('replaceInlineLinks("bla [foo]{@link https://google.com} pp [bar]{@link https://bar.com} asd"', function () {
    var str = structure.replaceInlineLink('bla [foo]{@link https://google.com} pp [bar]{@link https://bar.com} asd')
    assert.equal(str, "bla <a href='https://google.com'>foo</a> pp <a href='https://bar.com'>bar</a> asd")
  })

  it('replaceInlineLinks("bla {@link https://google.com Visit Google} pp"', function () {
    var str = structure.replaceInlineLink('bla {@link https://google.com Visit Google} pp')
    assert.equal(str, "bla <a href='https://google.com'>Visit Google</a> pp")
  })

  it('replaceInlineLinks("bla {@link https://google.com Visit Google} pp {@link https://google.com Visit Google2} "', function () {
    var str = structure.replaceInlineLink('bla {@link https://google.com Visit Google} pp {@link https://google.com Visit Google2}')
    assert.equal(str, "bla <a href='https://google.com'>Visit Google</a> pp <a href='https://google.com'>Visit Google2</a>")
  })

  it('replaceInlineLinks("bla {@link https://google.com} pp"', function () {
    var str = structure.replaceInlineLink('bla {@link https://google.com} pp')
    assert.equal(str, "bla <a href='https://google.com'>google.com</a> pp")
  })

  it('replaceInlineLinks("bla {@link Runner#timeout}."', function () {
    var str = structure.replaceInlineLink('bla {@link Runner#timeout}.')
    assert.equal(str, "bla <a href='#dl-Runner-timeout'>Runner#timeout</a>.")
  })

  it('.isRelativeLink("http://bla.com") === false', function () {
    assert.equal(structure.isRelativeLink('http://bla.com'), false)
  })

  it('.isRelativeLink("https://bla.com/asd") === false', function () {
    assert.equal(structure.isRelativeLink('https://bla.com/asd'), false)
  })

  it('.isRelativeLink("//bla.com/123") === false', function () {
    assert.equal(structure.isRelativeLink('//bla.com/123'), false)
  })

  it('.isRelativeLink("/bla") === true', function () {
    assert.equal(structure.isRelativeLink('/bla'), true)
  })

  it('.isRelativeLink("./bla") === true', function () {
    assert.equal(structure.isRelativeLink('./bla'), true)
  })

  it('addUrlToDoclets()', function () {
    var fakeDoclets = [{
      meta: {
        filename: 'lib/foo.js',
        lineno: 15
      }
    }]
    structure.addUrlToDoclets(fakeDoclets, 'http://github.com/lipp/node-jet', 'v1.0.0')
    assert.equal(fakeDoclets[0].meta.url, 'http://github.com/lipp/node-jet/blob/v1.0.0/lib/foo.js#L15')
  })

  it('isPublic()', function () {
    assert.equal(structure.isPublic({}), true)
    assert.equal(structure.isPublic({
      access: 'public'
    }), true)
    assert.equal(structure.isPublic({
      access: 'private'
    }), false)
    assert.equal(structure.isPublic({
      access: 'protected'
    }), false)
    assert.equal(structure.isPublic({
      tags: [{
        title: 'api',
        value: 'public'
      }]
    }), true)
    assert.equal(structure.isPublic({
      tags: [{
        title: 'bla',
        value: 'public'
      }]
    }), true)
    assert.equal(structure.isPublic({
      tags: [{
        title: 'api',
        value: 'private'
      }]
    }), false)
    assert.equal(structure.isPublic({
      tags: [{
        title: 'api',
        value: 'protected'
      }]
    }), false)
  })

  it('createMarkdownRenderer', function () {
    var renderer = structure.createMarkdownRenderer('http://github.com/lipp/node-jet', 'master')
    var html = renderer('[about](/about.html)')
    assert(html.indexOf('<a href="http://github.com/lipp/node-jet/blob/master/about.html">about</a>') > -1)
    html = renderer('![Alt text](/path/to/img.jpg)')
    assert(html.indexOf('<img src="http://github.com/lipp/node-jet/raw/master/path/to/img.jpg" alt="Alt text">') > -1)
  })

  describe('the ignore fixture doclets', function () {
    var doclets
    beforeEach(function () {
      var dir = path.join(__dirname, '../fixtures/ignore')
      var data = gather.gatherDocletsAndMeta(dir, true)
      doclets = data.doclets
    })

    it('should have length 7 ', function () {
      assert.equal(doclets.length, 7)
    })

    it('rejecting all isIgnored gives 1 doclet ', function () {
      var notIgnored = _.reject(doclets, structure.isIgnored(doclets))
      assert.equal(notIgnored.length, 2)
      assert(_.findWhere(notIgnored, {longname: 'Bar'}))
      assert(_.findWhere(notIgnored, {longname: 'Bar#setY'}))
    })
  })

  describe('the closure syntax fixture doclets', function () {
    var foo
    before(function () {
      var dir = path.join(__dirname, '../fixtures/closure-syntax')
      var data = gather.gatherDocletsAndMeta(dir, true)
      var docletsByLongname = {}
      docletsByLongname['module:foo/bar~Bla.bla'] = true
      var docletsByName = {}
      docletsByName.Point = {
        longname: 'Super.Point'
      }
      structure.addTypeLinks(docletsByLongname, docletsByName, data.doclets[0])
      structure.unflattenParams(data.doclets[0])
      foo = data.doclets[0]
    })

    it('foo.params[0].type.typeNames is correct', function () {
      var typeNames = foo.nestedParams[0].__content.type.typeNames
      assert.equal(typeNames.length, 1)
      assert.equal(typeNames[0].length, 4)
      assert.equal(typeNames[0][0].name, 'Array')
      assert.equal(typeNames[0][1].delimiter, '<')
      assert.equal(typeNames[0][2].name, 'Point')
      assert.equal(typeNames[0][2].url, '#dl-Super-Point')
      assert.equal(typeNames[0][3].delimiter, '>')
    })

    it('foo.params[1].type.typeNames is correct', function () {
      var typeNames = foo.nestedParams[1].__content.type.typeNames
      assert.equal(typeNames.length, 1)
      assert.equal(typeNames[0].length, 1)
      assert.equal(typeNames[0][0].name, 'Object')
    })

    it('foo.params[2].type.typeNames is correct', function () {
      var typeNames = foo.nestedParams[2].__content.type.typeNames
      assert.equal(typeNames.length, 1)
      assert.equal(typeNames[0].length, 1)
      assert.equal(typeNames[0][0].name, 'foo/bar~Bla.bla')
      assert.equal(typeNames[0][0].url, '#dl-module-foo/bar-Bla-bla')
    })

    it('foo.params[3].type.typeNames is correct', function () {
      var typeNames = foo.nestedParams[3].__content.type.typeNames
      assert.equal(typeNames.length, 2)
      assert.equal(typeNames[0].length, 6)
      assert.equal(typeNames[0][0].name, 'Object')
      assert.equal(typeNames[0][1].delimiter, '<')
      assert.equal(typeNames[0][2].name, 'string')
      assert.equal(typeNames[0][3].delimiter, ', ')
      assert.equal(typeNames[0][4].name, 'number')
      assert.equal(typeNames[0][5].delimiter, '>')
      assert.equal(typeNames[1].length, 4)
      assert.equal(typeNames[1][0].name, 'Array')
      assert.equal(typeNames[1][1].delimiter, '<')
      assert.equal(typeNames[1][2].name, 'number')
      assert.equal(typeNames[1][3].delimiter, '>')
    })

    it('foo.params[3].type.typeNames is correct', function () {
      var typeNames = foo.nestedParams[4].__content.type.typeNames
      assert.equal(typeNames.length, 1)
      assert.equal(typeNames[0].length, 8)
      assert.equal(typeNames[0][0].name, 'Array')
      assert.equal(typeNames[0][1].delimiter, '<')
      assert.equal(typeNames[0][2].delimiter, '(')
      assert.equal(typeNames[0][3].name, 'number')
      assert.equal(typeNames[0][4].delimiter, '|')
      assert.equal(typeNames[0][5].name, 'string')
      assert.equal(typeNames[0][6].delimiter, ')')
      assert.equal(typeNames[0][7].delimiter, '>')
    })
  })
})
