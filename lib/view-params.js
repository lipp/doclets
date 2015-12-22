var structure = require('./structure');
var _ = require('underscore');

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



module.exports.getApiParams = function (data) {
	return {
		modules: structure.buildHierarchy(data),
		articles: data.articles,
		version: data.branch || '',
		name: data.name || '',
		'_': _,
		tools: tools
	};
};

module.exports.getArticleParams = function (data, article) {
	article = _.findWhere(data.articles, {
		id: article
	});
	var html = structure.buildArticleHtml(article, data.githubUrl);
	return {
		modules: structure.buildHierarchy(data),
		articles: data.articles,
		version: data.branch || '',
		name: data.name || '',
		contentHtml: html,
		'_': _,
		tools: tools
	};
};