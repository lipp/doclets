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

var repoFromEvent = module.exports.repoFromEvent = function (event) {
  if (event) {
    var repo = event.repository
    var branch
    if (event.ref_type === 'tag') {
      branch = event.ref
    } else {
      var match = event.ref.match(/refs\/(?:heads|tags)\/(.+)/)
      branch = match && match[1]
    }
    return {
      user: repo.owner.name || repo.owner.login,
      name: repo.name,
      branch: branch,
      url: repo.html_url
    }
  } else {
    return {
      user: 'unknown',
      name: 'unknown',
      branch: 'unknown',
      url: ''
    }
  }
}

module.exports.getApiParams = function (row) {
  var data = row.data
  var repo = repoFromEvent(row.event)
  return {
    modules: structure.buildHierarchy(data, repo),
    articles: data.articles,
    repo: repo,
    '_': _,
    tools: tools,
    versionsPath: './',
    articlesPath: repo.branch + '/',
    apiPath: ''
  }
}

module.exports.getArticleParams = function (row, article) {
  var data = row.data
  var repo = repoFromEvent(row.event)
  article = _.findWhere(data.articles, {
    id: article
  })
  var html = structure.buildArticleHtml(article, repo.url, repo.branch)
  return {
    modules: structure.buildHierarchy(data, repo),
    articles: data.articles,
    repo: repo,
    contentHtml: html,
    '_': _,
    tools: tools,
    versionsPath: '../',
    articlesPath: '',
    apiPath: '../' + repo.branch
  }
}
