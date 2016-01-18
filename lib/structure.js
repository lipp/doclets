var _ = require('underscore')
var marked = require('marked')
var urlParser = require('url')

var modules = {}
var classes = {}

var initModules = function (doclets) {
  var createModule = function (doclet) {
    return {
      classes: [],
      interfaces: [],
      functions: [],
      constants: [],
      typedefs: [],
      externals: [],
      members: [],
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
          return 'module'
        }
      }
    }
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
  'member': 'members'
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
