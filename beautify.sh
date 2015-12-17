#!/usr/bin/env sh
find . -name "*.js" | grep -v node_modules | xargs node_modules/.bin/js-beautify -j -r -t --good-stuff
node_modules/.bin/js-beautify -j -r -t --good-stuff ./bin/ghostdoc
