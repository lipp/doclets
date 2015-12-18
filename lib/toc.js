var fs = require('fs');
var _ = require('underscore');

var toc = {};

var repos = {};

toc.add = function (repoUrl, branch, configYaml) {
	var entry = repos[repoUrl] = repos[repoUrl] || {};
	entry[branch] = configYaml;
	fs.writeFileSync('./toc.json', JSON.stringify(repos, null, '\t'));
};

toc.load = function (eachTocEntry) {
	try {
		console.log('load');
		repos = JSON.parse(fs.readFileSync('./toc.json'));

		_.each(repos, function (branches, repoUrl) {
			console.log(branches, repoUrl);
			_.each(branches, function (config, branch) {
				eachTocEntry(repoUrl, branch, config);
			});
		});
	} catch (err) {
		console.log('failed to load toc.json', err);
		repos = {};
	}
};

module.exports = toc;