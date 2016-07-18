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

var autoGuessCtor = module.exports.autoGuessCtor = function (doclets) {
  return function (doclet) {
    if (doclet.kind === 'function') {
      var nameStart = doclet.name.substr(0, 1)
      if (nameStart !== nameStart.toUpperCase()) {
        return
      }
      var child = _.findWhere(doclets, {memberof: doclet.longname})
      if (child && child.scope === 'instance') {
        doclet.kind = 'class'
      }
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
  str = str.replace(/{@link(?:plain|code)?\s([^\s}]+?)[\s|\|]+([^}]+?)}/g, function (match, link, text) {
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
  var fields = ['params', 'returns']
  fields.forEach(function (field) {
    if (doclet[field]) {
      doclet[field].forEach(function (param) {
        if (param.description) {
          param.description = replaceInlineLinks(param.description)
        }
      })
    }
  })
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

var unflattenParams = module.exports.unflattenParams = function (doclet) {
  if (doclet.params) {
    var byLongname = doclet.params.map(function (param) {
      param.name = param.name || 'unnamed'
      return {
        __name: param.name.replace(/\[\]/g, ''), // replace array braces a.b[].c
        __content: param
      }
    })
    byLongname = _.indexBy(byLongname, '__name')
    var augmenteds = {}
    _.each(byLongname, function (wrappedParam, longname) {
      var parts = longname.split('.')
      var typedParts = wrappedParam.__content.name.split('.')
      for (var i = 0; i < parts.length; ++i) {
        var name = parts.slice(0, i + 1).join('.')
        if (!byLongname[name] && !augmenteds[name]) {
          var isArray = typedParts[i].indexOf('[]') === (typedParts[i].length - 2)
          var augmented = augmenteds[name] = {
            __name: name,
            __content: {name: parts[i]}
          }
          if (isArray) {
            augmented.__content.type = {
              names: ['Array']
            }
          } else {
            augmented.__content.type = {
              names: ['Object']
            }
          }
          if (i === 0) {
            // add missing root elements. this is a best guess.
            doclet.params.push(augmented.__content)
          }
        }
      }
    })
    var sortedKeys = _.chain(byLongname)
      .extend(augmenteds)
      .keys()
      .sortBy(function (key) {
        return key.length
      })
      .value()
    // this is required due to a bug in flat.unflatten (https://github.com/hughsk/flat/issues/43)
    var bySortedLongname = {}
    sortedKeys.forEach(function (key) {
      bySortedLongname[key] = byLongname[key]
    })
    var nestedParams = flat.unflatten(bySortedLongname)
    var sortedNested = []
    doclet.params.forEach(function (param) {
      if (param.name.indexOf('.') === -1) {
        sortedNested.push(nestedParams[param.name])
      }
    })
    doclet.nestedParams = sortedNested
  }
}

var removeInvalidContent = module.exports.removeInvalidContent = function (doclet) {
  ['params', 'properties', 'returns'].forEach(function (content) {
    if (doclet[content]) {
      doclet[content] = _.compact(doclet[content])
      if (doclet[content].length === 0) {
        delete doclet[content]
      }
    }
  })
}

var builtInTypes = {
  'string': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String',
  'number': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number',
  'bool': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean',
  'boolean': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean',
  'array': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
  'object': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object',
  'undefined': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined',
  'null': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null',
  'function': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function',
  'error': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error',
  'date': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date',
  'regexp': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp',
  'promise': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
  'htmlelement': 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement'
}

var getLink = function (docletsByLongname, docletsByName, typeName) {
  var bi = builtInTypes[typeName.toLowerCase()]
  if (bi) {
    return {
      name: typeName,
      url: bi
    }
  } else if (docletsByLongname[typeName]) {
    var name
    if (typeName.indexOf('module:') === 0 || typeName.indexOf('external:') === 0) {
      name = typeName.split(':')[1]
    } else {
      name = typeName
    }
    return {
      url: '#' + idFromLongname(typeName),
      name: name
    }
  } else if (docletsByName[typeName]) {
    return {
      url: '#' + idFromLongname(docletsByName[typeName].longname),
      name: typeName,
      guessed: true
    }
  } else if (docletsByLongname['external:' + typeName]) {
    return {
      url: '#' + idFromLongname('external:' + typeName),
      name: typeName
    }
  } else {
    return {
      name: typeName,
      unknown: true
    }
  }
}

var getClosureParams = module.exports.getClosureParams = function (docletsByLongname, docletsByName, param) {
  var matches = param.match(/([^\.<>]+\.<)|([^\|\(\)<>,]+)|(\(|\)|<|>|\||,\s?)/g)
  var parts = []
  matches.forEach(function (match) {
    if (match.length > 1 && match.indexOf('.<') === (match.length - 2)) {
      var name = match.substr(0, match.length - 2)
      parts.push(getLink(docletsByLongname, docletsByName, name))
      parts.push({
        delimiter: '<'
      })
    } else if (match.match(/\(|\)|<|>|,|\|\s?/g)) {
      parts.push({
        delimiter: match
      })
    } else {
      parts.push(getLink(docletsByLongname, docletsByName, match))
    }
  })
  return parts
}

var addTypeLinks = module.exports.addTypeLinks = function (docletsByLongname, docletsByName, doclet) {
  var fields = ['params', 'returns']
  var getClosureParamsFn = getClosureParams.bind(null, docletsByLongname, docletsByName)
  fields.forEach(function (field) {
    if (doclet[field]) {
      doclet[field].forEach(function (param) {
        if (param.type && param.type.names) {
          param.type.typeNames = param.type.names.map(getClosureParamsFn)
        } else {
          param.type = param.type || {}
          param.type.typeNames = []
        }
      })
    }
  })
  if (doclet.type && doclet.type.names) {
    doclet.type.typeNames = doclet.type.names.map(getClosureParamsFn)
  }
  if (doclet.implements) {
    doclet.implements = doclet.implements.map(getLink.bind(null, docletsByLongname, docletsByName))
  }
}

var fixKind = function (doclet) {
  if (doclet.kind === 'member' && doclet.params) {
    doclet.kind = 'function'
  }
}

module.exports.flat = function (doclets) {
  if (!doclets) {
    return
  }
  if (!doclets._flat) {
    doclets._flat = _.chain(doclets)
      .filter(isPublic)
      .reject(isIgnored(doclets))
      .sortBy('longname')
      .each(removeInvalidContent)
      .each(fixKind)
      .each(processInlineTags)
      .each(autoGuessCtor(doclets))
      .each(addTypeLinks.bind(null, _.indexBy(doclets, 'longname'), _.indexBy(doclets, 'name')))
      .each(unflattenParams)
      .value()
  }
  return doclets._flat
}

module.exports.tree = function (doclets) {
  clearAnonymous(doclets)
  var modules = _.chain(doclets)
    .filter(isPublic)
    .each(fixKind)
    .each(autoGuessCtor(doclets))
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
