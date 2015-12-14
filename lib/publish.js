var jade = require('jade');
var utils = require('./utils');
var _ = require('underscore');

/**
 * A Taffy DB instance
 * @external Taffy
 * @see {@link http://www.taffydb.com/}
 */
var builtInTypes = [
    'string',
    'number',
    'bool',
    'boolean',
    'array',
    'object',
    'undefined',
    'null'
];


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
    },
    isBuiltInType: function(typename) {
        typename = typename.toLowerCase();
        return builtInTypes.indexOf(typename) > -1;
    },
    linkFromSee: function(see) {
        //"{@link http://bluebirdjs.com/docs/api-reference.html|Bluebird API}"
        var parts = see.match(/@link\s+([^|]+)(\s*\|\s*)?(.*)}/);
        if (parts) {
            return {
                url: parts[1],
                name: parts[3]
            };
        }
        return {};
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