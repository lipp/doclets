var _ = require('underscore');
var fs = require('fs');
var child_process = require('child_process');
var yaml = require('js-yaml');
var recursiveReadSync = require('recursive-readdir-sync');
var path = require('path');
var uuid = require('uuid');
var pathIsAbsolute = require('path-is-absolute');

var changeFilenameFromAbsoluteToRelative = function (doclets, dir) {
	doclets.forEach(function (doclet) {
		if (doclet.kind && doclet.kind !== 'package') {
			try {
				var parts = doclet.meta.path.split(dir);
				delete doclet.meta.path;
				doclet.meta.filename = path.join('./', parts[1] || '', doclet.meta.filename);
			} catch (err) {
				console.log('change to relative filename failed', doclet.longname, err);
				console.log('change to relative filename failed', doclet.longname, doclet.kind);
			}
		}
	});
};

var createDoclets = function (config, workDir) {
	var jsFiles = getFiles(config, workDir);
	if (jsFiles.length < 1) {
		throw 'no files';
	}
	var jsdocOptions = jsFiles.map(function (fileName) {
		if (pathIsAbsolute(fileName)) {
			return fileName;
		} else {
			return process.cwd() + '/' + fileName;
		}
	});
	jsdocOptions.push('-t');
	jsdocOptions.push(__dirname + '/capture-template');
	jsdocOptions.push('-c');
	jsdocOptions.push(__dirname + '/jsdoc.conf');
	var filename = uuid.v1();
	jsdocOptions.push('-d');
	jsdocOptions.push(filename);
	var jsdoc = child_process.spawnSync(__dirname + '/../node_modules/.bin/jsdoc', jsdocOptions, {
		cwd: __dirname
	});
	if (jsdoc.error) {
		throw jsdoc.error;
	}
	var taffyJson = path.join(__dirname, filename);
	var taffyData = JSON.parse(fs.readFileSync(taffyJson));
	fs.unlink(taffyJson);
	changeFilenameFromAbsoluteToRelative(taffyData, workDir);
	return taffyData;
};

var getFiles = function (config, dir) {
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

var getArticles = function (config, dir) {
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
	var dbEntry = {
		version: '1.0.0',
		type: 'jsdoc',
		repo: {},
		date: new Date().toISOString(),
		config: yaml.safeLoad(fs.readFileSync(path.join(dir, '.doclets.yml')))
	};

	var match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
	dbEntry.repo.user = match[1];
	dbEntry.repo.name = match[2];
	dbEntry.repo.private = false;
	dbEntry.repo.url = githubUrl;
	dbEntry.repo.type = 'github';
	dbEntry.repo.branch = branch;

	var t1 = new Date();
	dbEntry.doclets = createDoclets(dbEntry.config, dir);
	var t2 = new Date();
	dbEntry.perf = {};
	dbEntry.perf.doclets = t2 - t1;
	t1 = t2;
	if (dbEntry.config.packageJson) {
		dbEntry.packageJson = JSON.parse(fs.readFileSync(path.join(dir, dbEntry.config.packageJson)));
	}
	dbEntry.articles = getArticles(dbEntry.config, dir);
	t2 = new Date();
	dbEntry.perf.others = t2 - t1;
	return dbEntry;
};

module.exports.gatherDocletsAndMeta = createDocletsAndMeta;
module.exports.createDoclets = createDoclets;