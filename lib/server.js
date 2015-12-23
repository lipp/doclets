var express = require('express');
var slash = require('express-slash');
var fs = require('fs');
var path = require('path');
var viewParams = require('./view-params');

var init = function (port, db) {
	var app = express();
	app.enable('strict routing');

	app.use(express.static(path.join(__dirname, '../assets')));
	app.set('view engine', 'jade');
	app.set('views', path.join(__dirname, '../views'));

	var router = express.Router({
		caseSensitive: app.get('case sensitive routing'),
		strict: app.get('strict routing')
	});

	app.use(router);
	app.use(slash());

	router.get('/:user', function (req, res) {
		var key = [req.params.user, req.params.repo].join('/');
		db.getModulesByUser(req.params.user, function (err, data) {
			var doclets = data.map(function (row) {
				return viewParams.getApiParams(row);
			});
			if (err) {
				res.status(500).send('Err ' + err);
				return;
			} else {
				res.render('user.jade', {
					doclets: doclets,
					user: req.params.user
				});
			}
		});
	});

	router.get('/:user/:repo', function (req, res) {
		var key = [req.params.user, req.params.repo].join('/');
		db.getVersionsByUserAndRepo(req.params.user, req.params.repo, function (err, data) {
			var versions = data.map(function (row) {
				return viewParams.getApiParams(row);
			});
			if (err) {
				res.status(500).send('Err ' + err);
				return;
			} else {
				res.render('versions.jade', {
					versions: versions,
					name: req.params.repo,
					user: req.params.user
				});
			}
		});
	});


	router.get('/:user/:repo/:version', function (req, res) {
		var key = [req.params.user, req.params.repo].join('/');
		db.get(key, req.params.version, function (err, data) {
			if (err) {
				res.status(500).send('Err ' + err);
				return;
			} else {
				res.render('api.jade', viewParams.getApiParams(data));
			}
		});
	});

	router.get('/:user/:repo/:version/:article', function (req, res) {
		var key = [req.params.user, req.params.repo].join('/');
		db.get(key, req.params.version, function (err, data) {
			if (err) {
				res.status(500).send('Err ' + err);
				return;
			} else {
				res.render('article.jade', viewParams.getArticleParams(data, req.params.article));
			}
		});
	});


	db.init(function (err) {
		if (err) {
			console.error('db init failed', err);
			process.exit(1);
		} else {
			app.listen(port, function (err) {
				if (err) {
					console.error('web-server start failed', err);
					process.exit(1);
				}
				console.log('web-server listening on port ' + port);
			});
		}
	});

};

module.exports.init = init;