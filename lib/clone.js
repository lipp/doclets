var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var simpleGit = require('simple-git');


module.exports.checkout = function (repoUrl, branch, dir, done) {
	console.log('checkout', repoUrl, branch);
	var gitDir = path.join(dir, repoUrl.split('github.com')[1].replace('/', '_'));

	fs.stat(gitDir, function (err) {
		if (!err) {
			console.log('reuse git dir');
			simpleGit(gitDir)
				.checkout('master')
				.pull()
				.checkout(branch)
				.then(function () {
					console.log('pulled');
					done(undefined, gitDir);
				});
		} else {
			console.log('create new git dir');
			fse.mkdirsSync(gitDir);
			simpleGit(gitDir)
				.clone(repoUrl, './')
				.log(function (a, b) {
					console.log('LOG', a, b);
				})
				.checkout(branch)
				.then(function () {
					console.log('fresh');
					done(undefined, gitDir);
				});
		}

	});

};