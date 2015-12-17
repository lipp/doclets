var jade = require('jade');
var utils = require('./utils');
var _ = require('underscore');
var fs = require('fs');
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

var render = function (taffy, options) {
	options = options || {};
	var modules = utils.buildHierarchy(taffy, options);
	var renderfn = jade.compileFile(__dirname + '/../views/docpage.jade', {
		pretty: true
	});
	return renderfn({
		modules: modules,
		'_': _,
		tools: tools
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
	var html = render(taffyData, options);
	fs.writeFileSync(path.join(options.outDir, 'api.html'), html);

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
	generateDoc: generateDoc
};