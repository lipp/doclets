var publish = require('./publish');
var git = require('nodegit');
var yaml = require('js-yaml');
var fse = require('fs-extra');
var fs = require('fs');
var recursiveReadSync = require('recursive-readdir-sync');
var path = require('path');


module.exports.autodoc = function (docDir, repo, branch) {
	branch = branch || 'master';
	var repoUrl = 'https://github.com/' + repo;
	var repoFileRoot = 'https://github.com/' + repo + '/blob/' + branch;
	var docRoot = 'lib';
	var gitDir = '_git' + repo.replace('/', '_');
	var cloneOptions = new git.CloneOptions();
	cloneOptions.checkoutBranch = branch;

	fse.removeSync(gitDir);

	git.Clone.clone(repoUrl, gitDir, cloneOptions)
		.then(function () {
			var config = yaml.safeLoad(fs.readFileSync(path.join(gitDir, '.autodoc.yml')));
			var files = [];
			if (config.files) {
				files = files.concet(config.files);
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
			var version = config.version || packageJson.version || branch;
			var outDir = path.join(docDir, name, version);
			fse.removeSync(outDir);
			fse.mkdirsSync(outDir);

			publish.generateDoc(files, {
				repo: repoFileRoot,
				outDir: outDir,
				dir: gitDir
			});
			fse.removeSync(gitDir);
		})
		.catch(function (err) {
			fse.removeSync(gitDir);
			console.log(err);
		});
};