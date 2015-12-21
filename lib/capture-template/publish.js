var fs = require('fs');

exports.publish = function (taffyDb, opts) {
	var doclets = [];
	taffyDb().each(function (doclet) {
		if (doclet.undocumented) {
			return;
		}
		delete doclet.___id;
		delete doclet.___s;
		if (doclet.meta && doclet.meta.code) {
			delete doclet.meta.code;
		}
		doclets.push(doclet);
	});
	var data = JSON.stringify(doclets, null, '\t');
	fs.writeFileSync('./taffy.json', data);
};