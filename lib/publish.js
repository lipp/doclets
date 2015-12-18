var jade = require('jade');
var utils = require('./utils');
var _ = require('underscore');
var fs = require('fs');
var fse = require('fs-extra');
var child_process = require('child_process');
var taffy = require('taffy');

/**
 * A Taffy DB instance
 * @external Taffy
 * @see {@link http://www.taffydb.com/}
 */
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

var renderDoc;

var render = function (modules, articles) {
	if (!renderDoc) {
		renderDoc = jade.compileFile(__dirname + '/../views/api.jade', {
			pretty: true
		});
	}
	return renderDoc({
		modules: modules,
		'_': _,
		tools: tools,
		articles: articles
	});
};

var createTaffyData = function (jsFiles, options) {
	if (jsFiles.length < 1) {
		throw 'no files';
	}

	var jsdocOptions = jsFiles.map(function (fileName) {
		return process.cwd() + '/' + fileName;
	});
	jsdocOptions.push('-t');
	jsdocOptions.push(__dirname + '/capture-template');
	jsdocOptions.push('-c');
	jsdocOptions.push(__dirname + '/jsdoc.conf');
	var jsdoc = child_process.spawnSync(__dirname + '/../node_modules/.bin/jsdoc', jsdocOptions, {
		cwd: __dirname
	});
	if (jsdoc.error) {
		throw jsdoc.error;
	}
	var taffyData = taffy(JSON.parse(fs.readFileSync(__dirname + '/taffy.json')));
	fs.unlink(__dirname + '/taffy.json');
	return taffyData;
};

var path = require('path');

var generateDoc = function (files, options) {
	var taffyData = createTaffyData(files, options);
	var modules = utils.buildHierarchy(taffyData, options);
	var html = render(modules, options.articles);
	fs.writeFileSync(path.join(options.outDir, 'api.html'), html);
	_.each(options.articles, function (article, index) {
		var tmpMdFile = path.join(__dirname, '../views', '123456.md');
		console.log('TMP', tmpMdFile);
		fse.copySync(path.join(options.dir, article.file), tmpMdFile);
		//fse.copySync('/Users/fitz2000/node-jet/README.md', tmpMdFile);
		var html = generateArticle(modules, options.articles, index);
		fs.writeFileSync(path.join(options.outDir, 'article' + index + '.html'), html);
		fs.unlink(tmpMdFile);
	});


};

var renderArticle;

var generateArticle = function (modules, articles, index) {
	if (!renderArticle) {
		renderArticle = jade.compileFile(__dirname + '/../views/article.jade', {
			pretty: true
		});
	}
	return renderArticle({
		modules: modules,
		'_': _,
		tools: tools,
		articles: articles,
		index: index
	});
};

var yaml = require('js-yaml');
var recursiveReadSync = require('recursive-readdir-sync');
var fse = require('fs-extra');
var generateGitDoc = function (gitDir, repoFileBaseUrl, versionString, htmlDir) {
	var config = yaml.safeLoad(fs.readFileSync(path.join(gitDir, '.autodoc.yml')));
	var files = [];
	if (config.files) {
		files = files.concat(config.files);
	}
	if (config.dir) {
		files = files.concat(recursiveReadSync(path.join(gitDir, config.dir)));
	}
	console.log(files);
	var packageJson;
	try {
		packageJson = JSON.parse(fs.readFileSync(path.join(gitDir, 'package.json')));
	} catch (e) {
		packageJson = {};
	}
	var name = config.name || packageJson.name;
	if (!name) {
		throw new Error('name must be defined');
	}
	var outDir = path.join(htmlDir, name, versionString);
	fse.removeSync(outDir);
	fse.mkdirsSync(outDir);

	var articles = _.map(config.articles || [], function (article) {
		var title = _.keys(article)[0];
		return {
			title: title,
			file: article[title]
		};
	});

	generateDoc(files, {
		repo: repoFileBaseUrl,
		outDir: outDir,
		dir: gitDir,
		articles: articles
	});
};

/**
 * The jsdoc template entry point.
 *
 * @function
 * @name publish
 * @param {Taffy} taffy A taffay array containing all doclets.
 * @param {Object} opts Options passed to jsdoc
 */
var publish = function (taffy, opts) {
	var html = render(taffy, opts);
	fs.writeFileSync('out.html', html);
};

module.exports = {
	render: render,
	createTaffyData: createTaffyData,
	publish: publish,
	generateDoc: generateDoc,
	generateGitDoc: generateGitDoc
};
