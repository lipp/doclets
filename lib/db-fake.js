var db = {};

var init = function (done) {
	done();
};


var put = function (key, branch, data, done) {
	console.log('putting', key, branch);
	db[key + branch] = data;
	done();
};

var get = function (key, branch, done) {
	console.log('getting', key, branch);
	done(undefined, db[key + branch]);
};

var getByUserAndRepo = function (user, repo, done) {
	done('not implemented');
};

module.exports = {
	init: init,
	put: put,
	get: get
};