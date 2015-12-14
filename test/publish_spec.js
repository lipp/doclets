var assert = require('assert');
var child_process = require('child_process');
var publish = require('../lib/publish');
var fs = require('fs');
var _ = require('underscore');
var recursive = require('recursive-readdir');

describe('The publish module', function() {
    var taffyData;

    describe('using the acme-jsdoc-example data', function() {
        before(function(done) {

            recursive('../node-jet/lib/', function(err, files) {
                if (err) {
                    done(err);
                    return;
                }
                taffyData = publish.createTaffyData(files);
                done();
            });
            //'-r', './node_modules/jade/lib',
            //'./node_modules/angular/angular.js',
            //'./node_modules/morgan/index.js',
            //						'-r', './node_modules/acme-jsdoc-example/src', 
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