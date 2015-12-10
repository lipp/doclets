var jade = require('jade');
var utils = require('./utils');
var _ = require('underscore');

/**
 * A Taffy DB instance
 * @external Taffy
 * @see {@link http://www.taffydb.com/}
 */

var tools = {
    modulename: function(longname) {
        if (longname === '_GLOBAL') {
            return 'global';
        } else {
            return longname.split('module:')[1];
        }
    },
    sortByName: function(doclets) {
        return _.sortBy(doclets, function(doclet) {
            return doclet.name;
        });
    },
    shortName: function(longname) {
        var parts = longname.split('~');
        if (parts && parts[1]) {
            return parts[1];
        } else {
            return longname;
        }
    }
};

var render = function(taffy, opts) {
    var modules = utils.buildHierarchy(taffy);
    var renderfn = jade.compileFile(__dirname + '/../views/docpage.jade', {
        pretty: true
    });
    return renderfn({
        modules: modules,
        '_': _,
        tools: tools
    });
};

/**
 * The jsdoc template entry point.
 *
 * @function
 * @name publish
 * @param {Taffy} taffy A taffay array containing all doclets.
 * @param {Object} opts Options passed to jsdoc
 */
var publish = function(taffy, opts) {};

module.exports = {
    render: render,
    publish: publish
};