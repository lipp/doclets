var fs = require('fs');

exports.publish = function (taffyDb, opts) {
	var doclets = [];
	taffyDb().each(function (doclet) {
		doclets.push(doclet);
	});
	var data = JSON.stringify(doclets, null, '\t');
	fs.writeFileSync('./taffy.json', data);
};