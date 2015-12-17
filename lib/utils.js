var _ = require('underscore');

/**
 * Convert a doclet's longname to a link (href) string.
 * @function
 * @param {string} longname A doclet longname, e.g. module:funny~Coyote
 * @return {string} A link either local or absolute 
 */
module.exports.longnameToLink = function (longname) {
	//var match = longname.match(/(module:)?([^#~\.]*
};


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

var createDocumentedDoclets = function (taffyDoclets) {
	var doclets = [];
	taffyDoclets().each(function (doclet) {
		if (doclet.undocumented || !isPublic(doclet)) {
			return;
		}
		doclets.push(doclet);
	});
	return doclets;
};

//var ImplicitClass = function() {
//};	

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

var addUrlToDoclets = function (doclets, location) {
	var base;
	if (path.isAbsolute(location.dir)) {
		base = location.dir;
	} else {
		base = path.join(process.cwd(), location.dir);
	}
	_.each(doclets, function (doclet) {
		try {
			var rel = path.join(doclet.meta.path.split(base)[1], doclet.meta.filename);
			doclet.meta.url = location.repo + rel + '#L' + doclet.meta.lineno;
		} catch (err) {
			console.log('no URL for', doclet.longname, err);
		}
	});
};

module.exports.buildHierarchy = function (taffyDoclets, location) {
	var doclets = createDocumentedDoclets(taffyDoclets);
	if (location && location.repo && location.dir) {
		addUrlToDoclets(doclets, location);
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