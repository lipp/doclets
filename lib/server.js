var express = require('express');
var fs = require('fs');
var path = require('path');
var viewParams = require('./view-params');

var init = function (port, db) {
	var app = express();

	app.use(express.static(path.join(__dirname, '../assets')));
	app.set('view engine', 'jade');
	app.set('views', path.join(__dirname, '../views'))


	app.get('/:user/:repo/:version/', function (req, res) {
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

	app.get('/:user/:repo/:version/_/:article', function (req, res) {
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