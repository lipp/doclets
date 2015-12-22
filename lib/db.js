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

var failCount = 0;

var init = function (done) {
	var port = process.env.COUCHDB_PORT_5984_TCP_PORT;
	db = new(cradle.Connection)('http://couchdb', port).database('doclets');
	db.exists(function (err, exists) {
		if (err) {
			console.log('error', err);
			++failCount;
			if (failCount < 10) {
				console.log('retrying', failCount);
				setTimeout(function () {
					init(done);
				}, 1000);
			} else {
				done(err);
			}
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