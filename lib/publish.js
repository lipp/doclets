var structure = require('./structure');
var gather = require('./gather');
var _ = require('underscore');
var db = require('./db');



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
];


var tools = {
	modulename: function (longname) {
		if (longname === '_GLOBAL') {
			return 'global';
		} else if (longname.indexOf('module:') > -1) {
			return longname.split('module:')[1];
		} else {
			return longname;
		}
	},
	sortByName: function (doclets) {
		return _.sortBy(doclets, function (doclet) {
			return doclet.name;
		});
	},
	shortName: function (longname) {
		var parts = longname.split('~');
		if (parts && parts[1]) {
			return parts[1];
		} else {
			return longname;
		}
	},
	isBuiltInType: function (typename) {
		typename = typename.toLowerCase();
		return builtInTypes.indexOf(typename) > -1;
	},
	linkFromSee: function (see) {
		//"{@link http://bluebirdjs.com/docs/api-reference.html|Bluebird API}"
		var parts = see.match(/@link\s+([^|]+)(\s*\|\s*)?(.*)}/);
		if (parts) {
			return {
				url: parts[1],
				name: parts[3]
			};
		}
		return {};
	}

};



var getApiParams = function (user, repo, version, done) {
	var key = [user, repo].join('/');
	db.get(key, version, function (err, data) {
		if (err) {
			done(err);
		} else {
			console.log('ID', data._id);
			var modules = structure.buildHierarchy(data);
			done(undefined, {
				modules: modules,
				articles: data.articles,
				version: data.branch || '',
				name: data.name || '',
				'_': _,
				tools: tools
			});
		}
	});
};

var getArticleParams = function (user, repo, version, article, done) {
	var key = [user, repo].join('/');
	db.get(key, version, function (err, data) {
		if (err) {
			done(err);
		} else {
			var modules = structure.buildHierarchy(data);
			article = _.findWhere(data.articles, {
				id: article
			});
			var html = structure.buildArticleHtml(article, data.githubUrl);
			done(undefined, {
				modules: modules,
				articles: data.articles,
				version: data.branch || '',
				name: data.name || '',
				contentHtml: html,
				'_': _,
				tools: tools
			});
		}
	});
};





var generateGitDoc = function (gitDir, repoUrl, branch) {
	var match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
	var user = match[1];
	var repoName = match[2];

	var data = gather.gatherDocletsAndMeta(gitDir, repoUrl, branch);
	var key = [user, repoName, branch].join('_');
	db[key] = data;
};


module.exports = {
	getArticleParams: getArticleParams,
	getApiParams: getApiParams,
	generateGitDoc: generateGitDoc
};