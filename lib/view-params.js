var structure = require('./structure')
var _ = require('underscore')

var builtInTypes = [
  'string',
  'number',
  'bool',
  'boolean',
  'array',
  'object',
  'undefined',
  'null',
  'function'
]

var tools = module.exports.tools = {
  modulename: function (longname) {
    if (longname === '_GLOBAL') {
      return 'global'
    } else if (longname.indexOf('module:') > -1) {
      return longname.split('module:')[1]
    } else {
      return longname
    }
  },
  sortByName: function (doclets) {
    return _.sortBy(doclets, function (doclet) {
      return doclet.name
    })
  },
  shortName: function (longname) {
    var parts = longname.split('~')
    if (parts && parts[1]) {
      return parts[1]
    } else {
      return longname
    }
  },
  isBuiltInType: function (typename) {
    typename = typename.toLowerCase()
    return builtInTypes.indexOf(typename) > -1
  },
  linkFromSee: function (see) {
    var parts = see.match(/^{@link\s+(http)?([^|\s]+)(\||\s)?(.*)?}/)
    if (parts) {
      var name
      if (parts[4]) {
        name = parts[4]
      } else if (parts[1]) {
        name = parts[1] + parts[2]
      } else {
        name = parts[2]
      }

      return {
        url: (parts[1] || '#') + parts[2],
        name: name
      }
    }
    parts = see.match(/^\[([^\]]+)\]{@link\s+(http)?(.*)}/)
    if (parts) {
      return {
        url: (parts[2] || '#') + parts[3],
        name: parts[1]
      }
    }
    return {}
  }

}

var getDescription = module.exports.getDescription = function (doclet) {
  if (doclet.data.packageJson && doclet.data.packageJson.description) {
    return doclet.data.packageJson.description
  } else if (doclet.repo) {
    return doclet.repo.description
  } else {
    return
  }
}

module.exports.getApiParams = function (doclet) {
  return {
    modules: structure.buildHierarchy(doclet.data, doclet.repo.url, doclet.version),
    articles: doclet.data.articles,
    repo: doclet.repo,
    owner: doclet.owner,
    '_': _,
    tools: tools,
    version: doclet.version,
    versionsPath: './',
    articlesPath: doclet.version + '/',
    apiPath: '',
    description: getDescription(doclet),
    date: doclet.created_at,
    tags: doclet.data.packageJson && doclet.data.packageJson.keywords
  }
}

module.exports.getArticleParams = function (doclet, article) {
  var data = doclet.data
  article = _.findWhere(data.articles, {
    id: article
  })
  var html = structure.buildArticleHtml(article, doclet.repo.url, doclet.version)
  return {
    modules: structure.buildHierarchy(data, doclet.repo.url, doclet.version),
    articles: data.articles,
    repo: doclet.repo,
    contentHtml: html,
    '_': _,
    tools: tools,
    version: doclet.version,
    versionsPath: '../',
    articlesPath: '',
    date: doclet.created_at,
    apiPath: '../' + doclet.version
  }
}

module.exports.getAccountParams = function (repos) {
  return {
    repoSettings: _.sortBy(repos, function (repo) {
      return repo.name
    }),
    _: _
  }
}
