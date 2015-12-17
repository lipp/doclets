#!/usr/bin/env node

var clone = require('../lib/clone');

clone.autodoc(process.argv[2], process.argv[3], process.argv[4]);