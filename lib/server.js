var express = require('express');
var fs = require('fs');
var path = require('path');
var publish = require('./publish');
var toc = require('./toc');

var init = function () {
	var app = express();

	app.use(express.static('assets'));
	app.set('view engine', 'jade');

	toc = new toc.Toc('toc.json');

	app.get('/', function (req, res) {
		res.render('index.jade', {
			packages: toc.all()
		});
	});

	app.get('/:user/:repo/:version/', function (req, res) {
		publish.getApiParams(req.params.user, req.params.repo, req.params.version, function (err, jadeParams) {
			if (jadeParams) {
				res.render('api.jade', jadeParams);
			} else {
				res.status(500).send('Err' + err);
			}
		});
	});

	app.get('/:user/:repo/:version/_/:article', function (req, res) {
		publish.getArticleParams(req.params.user, req.params.repo, req.params.version, req.params.article, function (err, jadeParams) {
			if (jadeParams) {
				res.render('article.jade', jadeParams);
			} else {
				res.status(500).send('Err' + err);
			}
		});
	});

	app.get(['/:user/:repo', '/:user/:repo/versions'], function (req, res) {
		var packages = toc.all();
		res.render('package.jade', {
			package: _.findWhere(packages, {
				name: req.params.package
			})
		});
	});


	return app;

};

module.exports.init = init;