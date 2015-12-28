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

module.exports.getApiParams = function (data) {
  return {
    modules: structure.buildHierarchy(data),
    articles: data.articles,
    version: data.repo.branch,
    name: data.repo.name || '',
    user: data.repo.user,
    '_': _,
    tools: tools,
    versionsPath: './',
    articlesPath: data.repo.branch + '/',
    apiPath: ''
  }
}

module.exports.getArticleParams = function (data, article) {
  article = _.findWhere(data.articles, {
    id: article
  })
  var html = structure.buildArticleHtml(article, data.repo.url, data.repo.branch)
  return {
    modules: structure.buildHierarchy(data),
    articles: data.articles,
    version: data.repo.branch,
    name: data.repo.name || '',
    user: data.repo.user,
    contentHtml: html,
    '_': _,
    tools: tools,
    versionsPath: '../',
    articlesPath: '',
    apiPath: '../' + data.repo.branch
  }
}
