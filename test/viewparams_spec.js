var assert = require('assert');
var viewParams = require('../lib/view-params');
var path = require('path');


describe('The view-params module', function () {

	describe('.tools', function () {

		var tools = viewParams.tools;

		it('.modulename("_GLOBAL") === "global"', function () {
			assert.equal(tools.modulename('_GLOBAL'), 'global');
		});

		it('.modulename("module:foo/bar") === "foo/bar"', function () {
			assert.equal(tools.modulename('module:foo/bar'), 'foo/bar');
		});

		it('.modulename("unknown Module schema") === "unknown Module schema"', function () {
			assert.equal(tools.modulename('unknown Module schema'), 'unknown Module schema');
		});

		it('.sortByName() works', function () {
			var sorted = tools.sortByName([{
				name: 'xas',
				a: 1
			}, {
				name: 'ab',
				a: 2
			}]);
			assert.equal(sorted.length, 2);
			assert.equal(sorted[0].name, 'ab');
			assert.equal(sorted[0].a, 2);
			assert.equal(sorted[1].name, 'xas');
			assert.equal(sorted[1].a, 1);
		});

		it('.shortName("module:foo/bar~Bla") === "Bla"', function () {
			assert.equal(tools.shortName('module:foo/bar~Bla'), 'Bla');
		});

		it('.shortName("Bla") === "Bla"', function () {
			assert.equal(tools.shortName('Bla'), 'Bla');
		});

		it('isBuiltInType(...) works', function () {
			var builtInTypes = [
    'string',
    'number',
    'bool',
    'boolean',
    'array',
    'object',
    'undefined',
    'null',
    'function'
			];
			builtInTypes.forEach(function (typeName) {
				assert.equal(tools.isBuiltInType(typeName), true);
			});
			assert.equal(tools.isBuiltInType('asd'), false);
		});

		it('linkFromSee("{@link http://google.com}") is correct', function () {
			var see = '{@link http://google.com}';
			var link = tools.linkFromSee(see);
			assert.equal(link.url, 'http://google.com');
			assert.equal(link.name, 'http://google.com');
		});

		it('linkFromSee("{@link http://bluebirdjs.com/docs/api-reference.html|Bluebird API}") is correct', function () {
			var see = '{@link http://bluebirdjs.com/docs/api-reference.html|Bluebird API}';
			var link = tools.linkFromSee(see);
			assert.equal(link.url, 'http://bluebirdjs.com/docs/api-reference.html');
			assert.equal(link.name, 'Bluebird API');
		});

		it('linkFromSee("{@link http://bluebirdjs.com/docs/api-reference.html Bluebird API}") is correct', function () {
			var see = '{@link http://bluebirdjs.com/docs/api-reference.html Bluebird API}';
			var link = tools.linkFromSee(see);
			assert.equal(link.url, 'http://bluebirdjs.com/docs/api-reference.html');
			assert.equal(link.name, 'Bluebird API');
		});

		it('linkFromSee("{@link FooBar FooBarClass}") is correct', function () {
			var see = '{@link FooBar FooBarClass}';
			var link = tools.linkFromSee(see);
			assert.equal(link.url, '#FooBar');
			assert.equal(link.name, 'FooBarClass');
		});

		it('linkFromSee("{@link FooBar}") is correct', function () {
			var see = '{@link FooBar}';
			var link = tools.linkFromSee(see);
			assert.equal(link.url, '#FooBar');
			assert.equal(link.name, 'FooBar');
		});

		it('linkFromSee("[Bla bla]{@link FooBar}") is correct', function () {
			var see = '[Bla bla]{@link FooBar}';
			var link = tools.linkFromSee(see);
			assert.equal(link.url, '#FooBar');
			assert.equal(link.name, 'Bla bla');
		});

		it('linkFromSee("[Bla bla]{@link http://google.com}") is correct', function () {
			var see = '[Bla bla]{@link http://google.com}';
			var link = tools.linkFromSee(see);
			assert.equal(link.url, 'http://google.com');
			assert.equal(link.name, 'Bla bla');
		});

	});

});