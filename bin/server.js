var server = require('../lib/server').init();
var db = require('../lib/db');
db.init(function (err) {
	if (err) {
		console.error(err);
		process.exit(1);
	} else {
		server.listen(8083);
	}
});