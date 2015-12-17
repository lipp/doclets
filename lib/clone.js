var fs = require('fs');
var path = require('path');
var simpleGit = require('simple-git');


module.exports.checkout = function (repoUrl, branch, dir, done) {
	console.log('checkout', repoUrl, branch);
	var gitDir = path.join(dir, repoUrl.split('github.com')[1].replace('/', '_'));

	fs.stat(gitDir, function (err) {
		if (!err) {
			console.log('asd');
			simpleGit(gitDir)
				.checkout('master')
				.pull()
				.checkout(branch)
				.then(function () {
					console.log('pulled');
					done(undefined, gitDir);
				});
		} else {
			simpleGit()
				.clone(repoUrl, gitDir)
				.checkout(branch)
				.then(function () {
					console.log('fresh');
					done(undefined, gitDir);
				});
		}

	});

};
