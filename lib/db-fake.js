var db = {};

module.exports.init = function (done) {
	done();
};


module.exports.put = function (key, branch, data, done) {
	console.log('putting', key, branch);
	db[key + branch] = data;
	done();
};

module.exports.get = function (key, branch, done) {
	console.log('getting', key, branch);
	done(undefined, db[key + branch]);
};

module.exports.getModulesByUser = function (user, done) {
	done(undefined, []);
};

module.exports.getVersionsByUserAndRepo = function (user, repo, done) {
	done(undefined, []);
};