var _ = require('underscore')
var marked = require('marked')
var urlParser = require('url')
var flat = require('flat')
var path = require('path')

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

var isIgnored = module.exports.isIgnored = function (doclets) {
  return function (doclet) {
    if (doclet.ignore) {
      return true
    }
    var moduleName = doclet.longname.match(/module:[^~\.#]+/)
    if (moduleName) {
      var module = _.findWhere(doclets, {longname: moduleName})
      if (module) {
        return module.ignore
      }
    }
    var parent = _.findWhere(doclets, {longname: doclet.memberof})
    if (parent) {
      return parent.ignore
    }
  }
}

var fileRootFromGitHubUrl = function (branch) {
  return '/blob/' + branch + '/'
}

var rawRootFromGitHubUrl = function (branch) {
  return '/raw/' + branch + '/'
}

module.exports.getPlaygrounds = function (doclet) {
  var playgrounds = _.filter(doclet.tags, {title: 'playground'})
  if (playgrounds.length > 0) {
    return playgrounds
  }
}

module.exports.hasLiveExamples = function (doclet) {
  if (doclet.tags) {
    return _.findWhere(doclet.tags, {title: 'live'}) !== undefined
  }
}

module.exports.addUrlToDoclets = function (doclets, githubUrl, branch) {
  var fileBaseUrl = githubUrl + fileRootFromGitHubUrl(branch)
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

var idFromLongname = module.exports.idFromLongname = function (longname) {
  var escaped = 'dl-' + longname.replace(/(\.|:|#|~|\s|\$)/g, '-')
  return escaped
}

var shortLinkName = function (parts) {
  if (parts.pathname.substr(-1) === '/') {
    parts.pathname = parts.pathname.substr(0, parts.pathname.length - 1)
  }
  return parts.host + parts.pathname
}

var createLink = module.exports.createLink = function (link, text) {
  var parts = urlParser.parse(link)
  if (parts.protocol && (parts.protocol === 'http:' || parts.protocol === 'https:')) {
    text = text || shortLinkName(parts)
  } else {
    text = text || link
    link = '#' + idFromLongname(link)
  }
  return "<a href='" + link + "'>" + text + '</a>'
}

var replaceInlineLinks = module.exports.replaceInlineLink = function (str) {
  str = str.replace(/\[(.+?)\]\s*{@link(?:plain|code)?\s([^}]+?)}/g, function (match, text, link) {
    return createLink(link, text)
  })
  str = str.replace(/{@link(?:plain|code)?\s([^\s}]+?)[\s|\|]([^}]+?)}/g, function (match, link, text) {
    return createLink(link, text)
  })
  str = str.replace(/{@link(?:plain|code)?\s([^\s}]+?)}/g, function (match, link) {
    return createLink(link)
  })
  return str
}

var normalizeSeeTag = module.exports.normalizeSeeTag = function (see) {
  if (!see.match(/{@link}/) && see.match(/^[^\s]+$/)) {
    return '{@link ' + see + '}'
  }
  return see
}

var processInlineTags = module.exports.processInlineTags = function (doclet) {
  if (doclet.description) {
    doclet.description = replaceInlineLinks(doclet.description)
  }
  if (doclet.see) {
    doclet.see = doclet.see.map(normalizeSeeTag)
    doclet.see = doclet.see.map(replaceInlineLinks)
  }
}

var createMarkdownRenderer = module.exports.createMarkdownRenderer = function (githubUrl, branch) {
  var fileBaseUrl = fileRootFromGitHubUrl(branch)
  var rawBaseUrl = rawRootFromGitHubUrl(branch)
  var linkFixer = new marked.Renderer()
  var renderLink = linkFixer.link
  var renderImage = linkFixer.image
  linkFixer.link = function (href, title, text) {
    if (isRelativeLink(href)) {
      href = githubUrl + path.join(fileBaseUrl, href)
    }
    return renderLink.call(this, href, title, text)
  }
  linkFixer.image = function (href, title, text) {
    if (isRelativeLink(href)) {
      href = githubUrl + path.join(rawBaseUrl, href)
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

var childs = module.exports.childs = function (node) {
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

var unflattenParams = module.exports.unflattenParams = function (doclet) {
  if (doclet.params) {
    var tmp = doclet.params.map(function (param) {
      param.name = param.name || 'unnamed'
      return {
        __name: param.name,
        __content: param
      }
    })
    tmp = _.indexBy(tmp, '__name')
    var nestedParams = flat.unflatten(tmp)
    var sortedNested = []
    doclet.params.forEach(function (param) {
      if (param.name.indexOf('.') === -1) {
        sortedNested.push(nestedParams[param.name])
      }
    })
    doclet.nestedParams = sortedNested
  }
}

module.exports.flat = function (doclets) {
  if (!doclets._flat) {
    doclets._flat = _.chain(doclets)
      .filter(isPublic)
      .reject(isIgnored(doclets))
      .sortBy('longname')
      .each(processInlineTags)
      .each(unflattenParams)
      .value()
  }
  return doclets._flat
}

module.exports.tree = function (doclets) {
  clearAnonymous(doclets)
  var modules = _.chain(doclets)
    .filter(isPublic)
    .reject(isIgnored(doclets))
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
    .sortBy('longname')
    .value()

  var globalTree = _.chain(doclets)
    .filter(isPublic)
    .reject(isIgnored(doclets))
    .filter(function (doclet) {
      return doclet.longname.indexOf('module:') === -1
    })
    .map(function (doclet) {
      return new Node(doclet)
    })
    .indexBy('__id')
    .value()

  if (_.keys(globalTree).length > 0) {
    modules.unshift({
      longname: 'globals',
      childs: flat.unflatten(globalTree, {delimiter: /~|\.|#/})
    })
  }

  return modules
}
