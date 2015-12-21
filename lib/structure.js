var _ = require('underscore');
var marked = require('marked');
var urlParser = require('url');


var isModuleName = function (longname) {
	return longname.indexOf('module:') === 0;
};

var modules = {};
var classes = {};

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
			doclet: doclet
		};
	};
	modules = _.chain(doclets)
		.filter(function (doclet) {
			return doclet.kind === 'module';
		})
		.indexBy('longname')
		.mapObject(function (doclet) {
			return createModule(doclet);
		})
		.value();

	// for doclets which are NOT part of a module
	modules._GLOBAL = createModule();
};

var initClasses = function (doclets) {
	classes = _.chain(doclets)
		.filter(function (doclet) {
			return doclet.kind === 'class' || doclet.kind === 'interface';
		})
		.each(function (classDoclet) {
			classDoclet.members = [];
		})
		.indexBy('longname')
		.value();
};

var isPublic = function (doclet) {
	if (doclet.access && doclet.access !== 'public') {
		return false;
	} else if (doclet.tags && _.filter(doclet.tags, function (tag) {
			return tag.title === 'api' && tag.value === 'private'
		}).length > 0) {
		return false;
	}

	return true;
};

var addToParent = function (doclets, category, pred) {
	_.chain(doclets)
		.filter(function (doclet) {
			return pred(doclet);
		})
		.each(function (docletOfKind) {
			if (docletOfKind.scope === 'global') {
				modules._GLOBAL[category].push(docletOfKind);
			} else {
				if (modules[docletOfKind.memberof]) {
					modules[docletOfKind.memberof][category].push(docletOfKind);
				} else if (classes[docletOfKind.memberof]) {
					classes[docletOfKind.memberof].members.push(docletOfKind);
				} else {
					console.log('unassigned', docletOfKind.longname, docletOfKind.kind, docletOfKind.memberof);
				}
			}
		});
};

var path = require('path');

var fileRootFromGitHubUrl = function (url, branch) {
	return url + '/blob/' + branch + '/';
};

var rawRootFromGitHubUrl = function (url, branch) {
	return url + '/raw/' + branch + '/';
};

var addUrlToDoclets = function (doclets, dir, fileBaseUrl) {
	var base;
	if (path.isAbsolute(dir)) {
		base = dir;
	} else {
		base = path.join(process.cwd(), dir);
	}
	_.each(doclets, function (doclet) {
		try {
			var rel = path.join(doclet.meta.path.split(base)[1] || '', doclet.meta.filename);
			doclet.meta.url = fileBaseUrl + rel + '#L' + doclet.meta.lineno;
		} catch (err) {
			console.log('no URL for', doclet.longname, err);
		}
	});
};

module.exports.buildHierarchy = function (data, skipUrl) {
	var doclets = _.filter(data.doclets, isPublic);
	if (!skipUrl) {
		addUrlToDoclets(doclets, data.genDir, fileRootFromGitHubUrl(data.githubUrl, data.githubBranch));
	}

	initModules(doclets);
	initClasses(doclets);

	var categories = {
		'class': 'classes',
		'interface': 'interfaces',
		'function': 'functions',
		'constant': 'constants',
		'callback': 'callbacks',
		'typedef': 'typedefs',
		'external': 'externals',
		'member': 'members'
	};
	_.each(_.keys(categories), function (kind) {
		addToParent(doclets, categories[kind], function (doclet) {
			return doclet.kind === kind;
		});
	});
	return modules;
};

var isRelativeLink = function (href) {
	if (urlParser.parse(href).protocol || href.indexOf('//') === 0) {
		return false;
	}
	return true;
};

module.exports.buildArticleHtml = function (article, githubUrl) {
	var fileBaseUrl = fileRootFromGitHubUrl(githubUrl);
	var rawBaseUrl = rawRootFromGitHubUrl(githubUrl);
	var linkFixer = new marked.Renderer();
	var renderLink = linkFixer.link;
	var renderImage = linkFixer.image;
	linkFixer.link = function (href, title, text) {
		if (isRelativeLink(href)) {
			href = fileBaseUrl + href;
		}
		return renderLink.call(this, href, title, text);
	};
	linkFixer.image = function (href, title, text) {
		if (isRelativeLink(href)) {
			href = rawBaseUrl + href;
		}
		return renderImage.call(this, href, title, text);
	};
	return marked(article.markdown, {
		renderer: linkFixer
	});
};