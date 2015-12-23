process.env.COUCHDB_DEBUG_URL = 'http://192.168.99.100:5984';


db = require('./lib/db');

db.init(function (err) {
	console.log(err);

	db.getModulesByUser('lipp', function (err, res) {
		console.log('lipp', res.length);
		//console.log(err, res);
	});

	db.getVersionsByUserAndRepo('lipp', 'node-jet', function (err, res) {
		console.log('lipp node-jet', res.length);
		//console.log(err, res);
	});

	db.getAllModules(function (err, res) {
		console.log('all', res, err);
		//console.log(err, res);
	});

	db.searchAllModules('a', function (err, res) {
		console.log('search', res, err);
		//console.log(err, res);
	});
});