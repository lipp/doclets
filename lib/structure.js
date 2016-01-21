var _ = require('underscore')
var marked = require('marked')
var urlParser = require('url')
var flat = require('flat')

var isPublic = module.exports.isPublic = function (doclet) {
  if (doclet.access && doclet.access !== 'public') {
    return false
  } else if (doclet.tags) {
    var apiTag = _.findWhere(doclet.tags, {
      title: 'api'
    })
    if (apiTag && apiTag.value !== 'public') {
      return false
    }
  }

  return true
}

var fileRootFromGitHubUrl = function (url, branch) {
  return url + '/blob/' + branch + '/'
}

var rawRootFromGitHubUrl = function (url, branch) {
  return url + '/raw/' + branch + '/'
}

module.exports.addUrlToDoclets = function (doclets, githubUrl, branch) {
  var fileBaseUrl = fileRootFromGitHubUrl(githubUrl, branch)
  _.each(doclets, function (doclet) {
    try {
      doclet.meta.url = fileBaseUrl + doclet.meta.filename + '#L' + doclet.meta.lineno
    } catch (err) {
      console.log('no URL for', doclet.longname, err)
    }
  })
}

var clearAnonymous = module.exports.clearAnonymous = function (doclets) {
  _.each(doclets, function (doclet) {
    var match = doclet.longname.match(/<anonymous>(~|\.|#)(.+)/)
    if (match) {
      doclet.longname = match[2]
    }
  })
}

var isRelativeLink = module.exports.isRelativeLink = function (href) {
  if (urlParser.parse(href).protocol || href.indexOf('//') === 0) {
    return false
  }
  return true
}

var createMarkdownRenderer = module.exports.createMarkdownRenderer = function (githubUrl, branch) {
  var fileBaseUrl = fileRootFromGitHubUrl(githubUrl, branch)
  var rawBaseUrl = rawRootFromGitHubUrl(githubUrl, branch)
  var linkFixer = new marked.Renderer()
  var renderLink = linkFixer.link
  var renderImage = linkFixer.image
  linkFixer.link = function (href, title, text) {
    if (isRelativeLink(href)) {
      href = fileBaseUrl + href
    }
    return renderLink.call(this, href, title, text)
  }
  linkFixer.image = function (href, title, text) {
    if (isRelativeLink(href)) {
      href = rawBaseUrl + href
    }
    return renderImage.call(this, href, title, text)
  }
  return function (markdown) {
    return marked(markdown, {
      renderer: linkFixer
    })
  }
}

module.exports.buildArticleHtml = function (article, githubUrl, branch) {
  var linkFixer = createMarkdownRenderer(githubUrl, branch)
  return linkFixer(article.markdown)
}

var Node = function (doclet, module) {
  if (module) {
    var shortName = doclet.longname.split(module.longname)[1] || '___self'
    this.__id = shortName.substr(1, shortName.length - 1)
  } else {
    this.__id = doclet.longname
  }
  this.__doclet = doclet
}

module.exports.childs = function (node) {
  return _.chain(node)
    .pick(function (val, key) {
      return key.indexOf('__') !== 0
    })
    .mapObject(function (value, key) {
      return {
        name: key,
        node: value
      }
    })
    .toArray()
    .sortBy('name')
    .value()
}

module.exports.flat = function (doclets) {
  return _.chain(doclets)
    .filter(isPublic)
    .sortBy('longname')
    .value()
}

module.exports.tree = function (doclets) {
  clearAnonymous(doclets)
  var modules = _.chain(doclets)
    .filter(isPublic)
    .where({kind: 'module'})
    .map(function (module) {
      var flatTree = _.chain(doclets)
        .filter(function (doclet) {
          return doclet.kind !== 'module'
        })
        .filter(function (doclet) {
          var regexp = new RegExp('^(' + module.longname + ')(~|\\.|#)')
          return doclet.longname.match(regexp) || doclet.longname === module.longname
        })
        .map(function (doclet) {
          return new Node(doclet, module)
        })
        .indexBy('__id')
        .value()

      module.childs = flat.unflatten(flatTree, {delimiter: /~|\.|#/})
      return module
    })
    .value()

  var globalTree = _.chain(doclets)
    .filter(isPublic)
    .filter(function (doclet) {
      return doclet.longname.indexOf('module:') === -1
    })
    .map(function (doclet) {
      return new Node(doclet)
    })
    .indexBy('__id')
    .value()

  if (_.keys(globalTree).length > 0) {
    modules.push({
      longname: 'globals',
      childs: flat.unflatten(globalTree, {delimiter: /~|\.|#/})
    })
  }

  return modules
}
