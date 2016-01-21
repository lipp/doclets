var _ = require('underscore')
var marked = require('marked')
var urlParser = require('url')
var flat = require('flat')

var modules = {}
var classes = {}

var initModules = function (doclets) {
  var createModule = function (doclet) {
    var module = {
      classes: [],
      interfaces: [],
      functions: [],
      constants: [],
      typedefs: [],
      externals: [],
      members: [],
      namespaces: [],
      doclet: doclet,
      kind: function () {
        //    console.log(doclets)
        var subdoclets = _.filter(doclets, function (cand) {
          return cand.longname === doclet.longname && cand.kind !== 'module'
        })
        if (subdoclets.length === 1) {
          if (subdoclets[0].kind === 'member') {
            return 'module'
          } else {
            return subdoclets[0].kind
          }
        } else {
          return doclet.type && doclet.type.names[0] || 'module'
        }
      }
    }
    return module
  }
  modules = _.chain(doclets)
    .filter(function (doclet) {
      return doclet.kind === 'module'
    })
    .indexBy('longname')
    .mapObject(function (doclet) {
      return createModule(doclet)
    })
    .value()

  // for doclets which are NOT part of a module
  modules._GLOBAL = createModule()
}

var initClasses = function (doclets) {
  classes = _.chain(doclets)
    .filter(function (doclet) {
      return doclet.kind === 'class' || doclet.kind === 'interface'
    })
    .each(function (classDoclet) {
      classDoclet.members = []
    })
    .indexBy('longname')
    .value()
}

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

var categories = {
  'class': 'classes',
  'interface': 'interfaces',
  'function': 'functions',
  'constant': 'constants',
  'callback': 'callbacks',
  'typedef': 'typedefs',
  'external': 'externals',
  'member': 'members',
  'namespace': 'namespaces'
}

var addToParent = function (doclets, category, pred) {
  _.chain(doclets)
    .filter(function (doclet) {
      return pred(doclet)
    })
    .each(function (docletOfKind) {
      if (docletOfKind.scope === 'global') {
        modules._GLOBAL[category].push(docletOfKind)
      } else {
        if (modules[docletOfKind.memberof]) {
          modules[docletOfKind.memberof][category].push(docletOfKind)
        } else if (classes[docletOfKind.memberof]) {
          classes[docletOfKind.memberof].members.push(docletOfKind)
        } else if (docletOfKind.kind !== 'member' && docletOfKind.memberof === undefined && modules[docletOfKind.longname]) {
          // the module itself IS a class, function, etc
          modules[docletOfKind.longname][categories[docletOfKind.kind]].push(docletOfKind)
        } else {
          console.log('unassigned', docletOfKind.longname, docletOfKind.kind, docletOfKind.memberof)
        }
      }
    })
}

var fileRootFromGitHubUrl = function (url, branch) {
  return url + '/blob/' + branch + '/'
}

var rawRootFromGitHubUrl = function (url, branch) {
  return url + '/raw/' + branch + '/'
}

var addUrlToDoclets = module.exports.addUrlToDoclets = function (doclets, githubUrl, branch) {
  var fileBaseUrl = fileRootFromGitHubUrl(githubUrl, branch)
  _.each(doclets, function (doclet) {
    try {
      doclet.meta.url = fileBaseUrl + doclet.meta.filename + '#L' + doclet.meta.lineno
    } catch (err) {
      console.log('no URL for', doclet.longname, err)
    }
  })
}

module.exports.buildHierarchy = function (data, repoUrl, repoBranch) {
  var doclets = _.filter(data.doclets, isPublic)
  addUrlToDoclets(doclets, repoUrl, repoBranch)

  initModules(doclets)
  initClasses(doclets)

  _.each(_.keys(categories), function (kind) {
    addToParent(doclets, categories[kind], function (doclet) {
      return doclet.kind === kind
    })
  })
  return modules
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
  return _.pick(node, function (val, key) {
    return key.indexOf('__') !== 0
  })
}

module.exports.tree = function (doclets) {
  var modules = _.chain(doclets)
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
    .filter(function (doclet) {
      return doclet.longname.indexOf('module:') === -1
    })
    .map(function (doclet) {
      return new Node(doclet)
    })
    .indexBy('__id')
    .value()

  modules._GLOBAL = {
    childs: flat.unflatten(globalTree, {delimiter: /~|\.|#/})
  }

  return modules
}
