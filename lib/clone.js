var publish = require('./lib/publish');
var git = require('nodegit');
var fse = require('fs-extra');

var branch = 'add-jsdoc';
var repo = 'lipp/node-jet';
var repoUrl = 'https://github.com/' + repo;
var repoFileRoot = 'https://github.com/' + repo + '/blob/' + branch;
var docRoot = 'lib';
var dir = repo.replace('/', '_');
var cloneOptions = new git.CloneOptions();
cloneOptions.checkoutBranch = branch;

fse.removeSync(dir);

git.Clone.clone(repoUrl, dir, cloneOptions)
	.then(function () {
		publish.generateDoc({
			repo: repoFileRoot,
			outFile: 'clone.html',
			dir: dir,
			docRoot: docRoot
		});
	})
	.catch(function (err) {
		console.log(err);
	});