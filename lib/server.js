var githubHandler = require('github-webhook-handler')({
	path: '/github/callback',
	secret: '12345678'
});
var express = require('express');
var app = express();
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var clone = require('./clone');
var publish = require('./publish');
var toc = require('./toc');
var yaml = require('js-yaml');

var gitRoot = 'git-root';

app.use(githubHandler);
app.use(express.static('pages'));
app.use(express.static('assets'));

fse.mkdirsSync(gitRoot);
fse.mkdirsSync('pages');

toc = new toc.Toc('toc.json');

var fileRootFromGitHubUrl = function (url, branch) {
	return url + '/blob/' + branch + '/';
};

toc.each(function (repoUrl, branch, config) {
	clone.checkout(repoUrl, branch, gitRoot, function (err, gitDir) {
		if (gitDir) {
			publish.generateGitDoc(gitDir, fileRootFromGitHubUrl(repoUrl), branch, 'pages');
		} else {
			console.error('failed to load', repoUrl, branch);
		}
	});
});

var server = app.listen(3420, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Maja listening at http://%s:%s', host, port);
});

var updateDoc = function (repoUrl, branch) {
	clone.checkout(repoUrl, branch, gitRoot, function (err, gitDir) {
		try {
			var config = yaml.safeLoad(fs.readFileSync(path.join(gitDir, '.autodoc.yml')));
			publish.generateGitDoc(gitDir, fileRootFromGitHubUrl(repoUrl), branch, 'pages');
			toc.add(repoUrl, branch, config);
		} catch (err) {
			console.log('updateDoc failed', repoUrl, branch, err);
		}
	});
};


githubHandler.on('push', function (event) {
	var data = event.payload;
	if (data.ref === 'refs/heads/master') {
		console.log('new release of', data.repository.full_name, 'master');
		updateDoc(data.repository.url, 'master');
	}
});

githubHandler.on('create', function (event) {
	var data = event.payload;
	if (data.ref_type === 'tag') {
		console.log('new release of', data.repository.full_name, data.ref);
		updateDoc(data.repository.html_url, data.ref);
	}
});