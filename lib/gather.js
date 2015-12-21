var _ = require('underscore');
var fs = require('fs');
var child_process = require('child_process');
var yaml = require('js-yaml');
var recursiveReadSync = require('recursive-readdir-sync');
var path = require('path');

var createDoclets = function (jsFiles) {
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
	var taffyJson = __dirname + '/taffy.json';
	var taffyData = JSON.parse(fs.readFileSync(taffyJson));
	fs.unlink(__dirname + '/taffy.json');
	return taffyData;
};

var getFiles = function (dir, config) {
	var files = [];
	if (config.files) {
		files = files.concat(config.files.map(function (file) {
			return path.join(dir, file);
		}));
	}
	if (config.dir) {
		files = files.concat(recursiveReadSync(path.join(dir, config.dir)));
	}
	return files;
};

var getArticles = function (dir, config) {
	return _.map(config.articles || [], function (article) {
		var title = _.keys(article)[0];
		var filename = article[title];
		var markdown = fs.readFileSync(path.join(dir, filename)).toString();
		return {
			title: title,
			markdown: markdown,
			id: title.replace(' ', '_').toLowerCase()
		};

	});
};

var createDocletsAndMeta = function (dir, githubUrl, branch) {
	var data = {};
	var match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
	data.user = match[1];
	data.repo = match[2];
	data.genDir = dir;
	data.githubUrl = githubUrl;
	data.branch = branch;
	data.config = yaml.safeLoad(fs.readFileSync(path.join(dir, '.autodoc.yml')));
	var files = getFiles(dir, data.config);
	data.doclets = createDoclets(files);
	try {
		data.packageJson = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
	} catch (_) {}
	data.articles = getArticles(dir, data.config);
	return data;
};

module.exports.gatherDocletsAndMeta = createDocletsAndMeta;