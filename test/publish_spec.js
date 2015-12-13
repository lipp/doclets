var assert = require('assert');
var child_process = require('child_process');
var publish = require('../lib/publish');
var fs = require('fs');
var _ = require('underscore');
var taffy = require('taffy');

describe('The publish module', function() {
    var taffyData;

    describe('using the acme-jsdoc-example data', function() {
        before(function(done) {
            var jsdoc = child_process.spawn('./node_modules/.bin/jsdoc', [
                //'-r', './node_modules/jade/lib',
                '-r', '../node-jet/lib/',
                //'./node_modules/angular/angular.js',
                //'./node_modules/morgan/index.js',
                //						'-r', './node_modules/acme-jsdoc-example/src', 
                '-t', './test/capture-template',
                '-c', 'jsdoc.conf'
            ]);
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
        after(function() {
            fs.unlink('./taffy.json');
        });

        describe('html= publish.render method', function() {
            var html;
            before(function() {
                html = publish.render(taffyData, {});
                fs.writeFileSync('test.html', html);
                //    console.log(html);
            });

            it('html is string', function() {
                assert.equal(typeof(html), 'string');
            });
        });


    });
});