# doclets

[![Join the chat at https://gitter.im/lipp/doclets](https://badges.gitter.im/lipp/doclets.svg)](https://gitter.im/lipp/doclets?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://travis-ci.org/lipp/doclets.svg?branch=master)](https://travis-ci.org/lipp/doclets) [![Coverage Status](https://coveralls.io/repos/lipp/doclets/badge.svg?branch=master&service=github)](https://coveralls.io/github/lipp/doclets?branch=master) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

# Dev setup

    $ docker-compose -f docker-compose-dev.yml up

## Run tests locally

    $ TEST=1 npm test
  
## Run webserver locally

    $ DEV=1 node bin/server.js
    
Adding users/repos does not work with the local server :(
This is due to GitHub WebHook configuration and GitHub OAuth wich require fix urls.
