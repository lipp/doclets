var cradle = require('cradle');
var db;

var initDesignDocuments = function () {
	db.save('_design/packages', {
		byUserRepoBranch: {
			map: function (doc) {
				if (doc.user && doc.repo) {
					emit([doc.user, doc.repo, doc.branch], doc);
				}
			}
		}
	});
};

var init = function (done) {
	db = new(cradle.Connection)('http://192.168.99.100', 5984).database('doclets');
	db.exists(function (err, exists) {
		if (err) {
			console.log('error', err);
			done(err);
		} else if (exists) {
			console.log('the force is with you.');
			initDesignDocuments();
			done();
		} else {
			console.log('database does not exists.');
			db.create();
			initDesignDocuments();
			done();
			/* populate design documents */
		}
	});
};


var put = function (key, branch, data, done) {
	console.log('putting', key, branch);
	db.save(key + branch, data, done);
};

var get = function (key, branch, done) {
	console.log('getting', key, branch);
	db.get(key + branch, done);
};

var getByUserAndRepo = function (user, repo, done) {
	db.view('packages/byUserRepoBranch', {
		startKey: [user, repo],
		endKey: [user, repo, '\u9999']
	}, done);
};

module.exports = {
	init: init,
	put: put,
	get: get
};