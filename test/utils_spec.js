var assert = require('assert');
var child_process = require('child_process');
var utils = require('../lib/utils');
var fs = require('fs');
var _ = require('underscore');
var taffy = require('taffy');

describe('The utils module', function() {
    var taffyData;

    describe('using the acme-jsdoc-example data', function() {
        before(function(done) {
            var jsdoc = child_process.spawn('./node_modules/.bin/jsdoc', ['-r', './node_modules/acme-jsdoc-example/src', '-t', './test/capture-template']);
            //jsdoc.stdout.pipe(process.stdout);
            jsdoc.on('close', function(code) {
                if (code === 0) {
                    taffyData = taffy(JSON.parse(fs.readFileSync('./taffy.json')));
                    done();
                } else {
                    done('jsdoc failed');
                }
            });
        });

        it('taffyData is TAFFY', function() {
            assert.ok(taffyData.TAFFY);
        });

        describe('utils.buildHierarchy', function() {
            var modules;
            before(function() {
                modules = utils.buildHierarchy(taffyData);
            });

            it('_.keys(modules) are the module longnames', function() {
                assert.deepEqual(_.keys(modules), ['module:funny', 'module:heavy', '_GLOBAL']);
            });

            it('modules._GLOBAL.functions is correct', function() {
                var functions = _.indexBy(modules._GLOBAL.functions, 'longname');
                assert.equal(_.size(functions), 1);
                assert.ok(functions.superFunc);
            });

            it('modules._GLOBAL.constants is correct', function() {
                var constants = _.indexBy(modules._GLOBAL.constants, 'longname');
                assert.equal(_.size(constants), 2);
                assert.ok(constants.greet);
                assert.ok(constants.config);
            });

            it('modules._GLOBAL.interfaces is correct', function() {
                assert.equal(modules._GLOBAL.interfaces.length, 0);
            });

            it('modules._GLOBAL.classes is correct', function() {
                assert.equal(modules._GLOBAL.classes.length, 0);
            });

            it('modules["module:heavy"].interfaces is correct', function() {
                var interfaces = _.indexBy(modules['module:heavy'].interfaces, 'longname');
                assert.equal(_.size(interfaces), 1);
                assert.ok(interfaces['module:heavy~Tool']);
            });

            it('modules["module:heavy"].classes is correct', function() {
                var classes = _.indexBy(modules['module:heavy'].classes, 'longname');
                assert.equal(_.size(classes), 2);
                assert.ok(classes['module:heavy~Bomb']);
                assert.ok(classes['module:heavy~Hammer']);
            });

            it('modules["module:heavy"].functions is correct', function() {
                assert.equal(modules['module:heavy'].functions.length, 0);
            });

            it('modules["module:heavy"].constants is correct', function() {
                assert.equal(modules['module:heavy'].constants.length, 0);
            });

            it('heavy/Tool has correct member', function() {
                var interfaces = _.indexBy(modules['module:heavy'].interfaces, 'longname');
                assert.equal(interfaces['module:heavy~Tool'].members.length, 1);
                assert.equal(interfaces['module:heavy~Tool'].members[0].longname, 'module:heavy~Tool#action');
            });

            it('funny/Coyote has correct member', function() {
                var members = modules['module:funny'].classes[0].members;
                assert.equal(members.length, 3);
            });

            it('modules["module:funny"].classes is correct', function() {
                var classes = _.indexBy(modules['module:funny'].classes, 'longname');
                assert.equal(_.size(classes), 1);
                assert.ok(classes['module:funny~Coyote']);
            });

            it('modules["module:funny"].functions is correct', function() {
                assert.equal(modules['module:funny'].functions.length, 0);
            });

            it('modules["module:funny"].constants is correct', function() {
                assert.equal(modules['module:funny'].constants.length, 0);
            });

            it('modules["module:funny"].interfaces is correct', function() {
                assert.equal(modules['module:funny'].interfaces.length, 0);
            });

        });
    });

    after(function() {
        fs.unlink('./taffy.json');
    });


});