var assert = require('assert');
var gather = require('../lib/gather');
var path = require('path');

describe('The gather module', function () {
	describe('minimal_1 fixture', function () {
		var data;
		before(function () {
			data = gather.gatherDocletsAndMeta(path.join(__dirname, 'fixtures', 'minimal_1'), 'http://github.com/foo/bar', 'v1.0.0');
		});

		it('basic info is correct', function () {
			var date;
			assert.equal(data.version, '1.0.0');
			assert.equal(data.type, 'jsdoc');
			assert.doesNotThrow(function () {
				date = new Date(data.date);
			});
			assert((date - new Date()) < 5000, 'date is plausible');
		});

		it('repo info is correct', function () {
			assert.equal(data.repo.type, 'github');
			assert.equal(data.repo.user, 'foo');
			assert.equal(data.repo.name, 'bar');
			assert.equal(data.repo.branch, 'v1.0.0');
			assert.equal(data.repo.private, false);
			assert.equal(data.repo.url, 'http://github.com/foo/bar');

		});

		it('.articles[0] is correct', function () {
			var article = data.articles[0];
			assert.equal(data.articles.length, 1);
			assert.equal(article.title, 'About');
			assert.equal(article.markdown, '#hello\n');
		});

		it('.doclets are correct', function () {
			assert.equal(data.doclets.length, 1);
			assert.equal(data.doclets[0].name, 'foo');
		});

		it('.doclets filename is relative to dir', function () {
			assert.equal(data.doclets[0].meta.filename, 'index.js');
		});

	});

	describe('minimal_2 fixture', function () {
		var data;
		before(function () {
			data = gather.gatherDocletsAndMeta(path.join(__dirname, 'fixtures', 'minimal_2'), 'http://github.com/foo/bar', 'v1.0.0');
		});

		it('.doclets filename is relative to dir', function () {
			assert.equal(data.doclets[0].meta.filename, 'lib/index.js');
		});

		it('.articles[0] is correct', function () {
			var article = data.articles[0];
			assert.equal(data.articles.length, 1);
			assert.equal(article.title, 'About');
			assert.equal(article.markdown, '#hello\n');
		});

	});
});