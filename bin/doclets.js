#!/usr/bin/env node

/* vim: set syntax=javascript */

var prompt = require('prompt')
require('colors')
var path = require('path')
var fs = require('fs')
var yaml = require('js-yaml')
var repoName = require('git-repo-name')
prompt.message = 'doclets'.blue
var gather = require('../lib/gather')

var log = function (message) {
  console.log('doclets: '.blue + message)
}

var logerr = function (message) {
  console.error('doclets: '.blue + message.red)
}

var getDefaultConfig = function () {
  try {
    console.log('doclets: Reading package.json ok'.blue)
    var config = JSON.parse(fs.readFileSync('package.json'))
    config.repository = config.repository || {}
    if (config.main && fs.lstatSync(config.main).isFile()) {
      config.main = path.dirname(config.main)
    }
    return config
  } catch (err) {
    log('Could not read package.json'.yellow)
    return {}
  }
}

var config = function () {
  var writeConfigYaml = function (inputs) {
    var config = {}
    config.dir = inputs.dir
    config.flavor = 'jsdoc'
    if (inputs.readme && inputs.readme !== '') {
      config.articles = []
      var articleEntry = {}
      articleEntry[inputs.readme] = 'README.md'
      config.articles.push(articleEntry)
    }
    fs.writeFileSync('.doclets.yml', yaml.dump(config))
    log('.doclets.yml created'.green)
    log('commit and push to generate initial documentation'.green)
  }

  var configDefaults = getDefaultConfig()
  var configSchema = {
    properties: {
      dir: {
        description: 'Root folder of source code',
        default: configDefaults.main || 'lib'
      }
    }
  }

  try {
    fs.accessSync('README.md')
    configSchema.properties.readme = {
      description: 'Title of README.md article',
      default: 'Readme',
      required: true
    }
  } catch (err) {
    console.log('no readme')
  }

  prompt.get(configSchema, function (err, result) {
    if (err) {
      console.error('Sorry, information not complete'.red)
      process.exit(1)
    } else {
      writeConfigYaml(result)
    }
  })
}

var preview = function () {
  try {
    fs.readFileSync('.doclets.yml')
  } catch (err) {
    logerr('Could not read ./doclets.yml')
    logerr('Please run:\n\t $ doclets config'.green)
    return
  }
  var configDefaults = getDefaultConfig()
  var repoOwner
  if (configDefaults.repository && configDefaults.repository.url) {
    var match = configDefaults.repository.url.match(/github\.com\/([^\/]+)\/.*/)
    if (match) {
      repoOwner = match[1]
    }
  }
  var previewSchema = {
    properties: {
      repository: {
        description: 'GitHub repository name',
        required: true,
        default: repoName.sync()
      },
      owner: {
        description: 'GitHub repository owner',
        required: true,
        default: repoOwner
      },
      port: {
        description: 'Preview webserver port',
        required: true,
        default: 8081
      }
    }
  }
  prompt.get(previewSchema, function (err, result) {
    if (err) {
      console.error('Sorry, information not complete'.red)
      process.exit(1)
    } else {
      var db = require('../lib/db-fake')
      process.env.NODE_ENV = 'test'
      var server = require('../lib/server')
      server.init(result.port, db)
      var docData = gather.gatherDocletsAndMeta('./')
      db.put(result.owner + '/' + result.repository, 'local', {data: docData}, function () {})
      log('finished'.yellow)
      log('starting webserver...'.yellow)
      log('visit:')
      log('http://localhost:' + result.port + '/' + result.owner + '/' + result.repository + '/local')
    }
  })
}

var commands = {
  config: config,
  preview: preview
}

var command = process.argv[2]

if (!command || Object.keys(commands).indexOf(command) === -1) {
  console.log('usage: doclets config | preview'.yellow)
  process.exit(1)
}

prompt.start()
commands[command]()
