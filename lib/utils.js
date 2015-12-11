var _ = require('underscore');

/**
 * Convert a doclet's longname to a link (href) string.
 * @function
 * @param {string} longname A doclet longname, e.g. module:funny~Coyote
 * @return {string} A link either local or absolute 
 */
module.exports.longnameToLink = function(longname) {
    //var match = longname.match(/(module:)?([^#~\.]*
};

var isModuleName = function(longname) {
    return longname.indexOf('module:') === 0;
};

var modules = {};
var classes = {};

var initModules = function(doclets) {
    var createModule = function(doclet) {
        return {
            classes: [],
            interfaces: [],
            functions: [],
            constants: [],
            doclet: doclet
        };
    };
    modules = _.chain(doclets)
        .filter(function(doclet) {
            return doclet.kind === 'module';
        })
        .indexBy('longname')
        .mapObject(function(doclet) {
            return createModule(doclet);
        })
        .value();

    // for doclets which are NOT part of a module
    modules._GLOBAL = createModule();
};

var initClasses = function(doclets) {
    classes = _.chain(doclets)
        .filter(function(doclet) {
            return doclet.kind === 'class' || doclet.kind === 'interface';
        })
        .each(function(classDoclet) {
            classDoclet.members = [];
        })
        .indexBy('longname')
        .value();
};

var createDocumentedDoclets = function(taffyDoclets) {
    var doclets = [];
    taffyDoclets().each(function(doclet) {
        if (doclet.undocumented) {
            return;
        }
        doclets.push(doclet);
    });
    return doclets;
};

var addToParent = function(doclets, category, pred) {
    _.chain(doclets)
        .filter(function(doclet) {
            return pred(doclet);
        })
        .each(function(docletOfKind) {
            if (docletOfKind.scope === 'global') {
                modules._GLOBAL[category].push(docletOfKind);
            } else {
                if (modules[docletOfKind.memberof]) {
                    modules[docletOfKind.memberof][category].push(docletOfKind);
                } else if (classes[docletOfKind.memberof]) {
                    classes[docletOfKind.memberof].members.push(docletOfKind);
                } else {
                    console.log('unassigned', docletOfKind);
                }
            }
        });
};

module.exports.buildHierarchy = function(taffyDoclets) {
    var doclets = createDocumentedDoclets(taffyDoclets);
    initModules(doclets);
    initClasses(doclets);

    var categories = {
        'class': 'classes',
        'interface': 'interfaces',
        'function': 'functions',
        'constant': 'constants'
    };
    _.each(['class', 'interface', 'function', 'constant'], function(kind) {
        addToParent(doclets, categories[kind], function(doclet) {
            return doclet.kind === kind;
        });
    });
    return modules;
};