var fs = require('fs');
var _ = require('underscore');


var Toc = function (filename) {
	this.filename = filename;
	try {
		this.repos = JSON.parse(fs.readFileSync(filename));
	} catch (err) {
		this.repos = {};
	}
};

Toc.prototype.destroy = function () {
	fs.unlink(this.filename);
	this.repos = {};
};

Toc.prototype.add = function (repoUrl, branch, configYaml) {
	var entry = this.repos[repoUrl] = this.repos[repoUrl] || {};
	entry[branch] = configYaml;
	fs.writeFileSync(this.filename, JSON.stringify(this.repos, null, '\t'));
};

Toc.prototype.each = function (cb) {
	_.each(this.repos, function (branches, repoUrl) {
		_.each(branches, function (config, branch) {
			cb(repoUrl, branch, config);
		});
	});
};

Toc.prototype.all = function () {
	var map = {};
	this.each(function (_, branch, config) {
		map[config.name] = map[config.name] || {
			versions: []
		};
		map[config.name].versions.push(branch);
	});
	return _.map(map, function (entry, key) {
		entry.name = key;
		return entry;
	});
};

module.exports.Toc = Toc;