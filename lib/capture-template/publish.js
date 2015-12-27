var fs = require('fs');

exports.publish = function (taffyDb, opts) {
	var doclets = [];
	console.log('asd', opts.destination);
	taffyDb().each(function (doclet) {
		if (doclet.undocumented || (doclet.kind && doclet.kind === 'package')) {
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
	fs.writeFileSync(opts.destination, data);
};