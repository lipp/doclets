#!/usr/bin/env node

/* vim: set syntax=javascript */

var prompt = require('prompt');
var colors = require('colors');
var path = require('path');
var fs = require('fs');
var yaml = require('js-yaml');
var GitHubApi = require('github');
var repoName = require('git-repo-name');
prompt.message = 'doclets'.blue;
var webhookUrl = 'http://7d650001.ngrok.io/github/callback';
var fse = require('fs-extra');
var gather = require('../lib/gather');
var express = require('express');

var log = function (message) {
	console.log('doclets: '.blue + message);
};

var logerr = function (message) {
	console.error('doclets: '.blue + message.red);
};


var getDefaultConfig = function () {
	try {
		console.log('doclets: Reading package.json ok'.blue);
		var config = JSON.parse(fs.readFileSync('package.json'));
		config.repository = config.repository || {};
		if (config.main && fs.lstatSync(config.main).isFile()) {
			config.main = path.dirname(config.main);
		};
		return config;
	} catch (err) {
		log('Could not read package.json'.yellow);
		return {};
	}
};



var initRepo = function () {
	var configDefaults = getDefaultConfig();
	var repoOwner
	if (configDefaults.repository && configDefaults.repository.url) {
		var match = configDefaults.repository.url.match(/github\.com\/([^\/]+)\/.*/);
		if (match) {
			repoOwner = match[1];
		}
	}
	var setupRepo = function (config) {
		var github = new GitHubApi({
			version: '3.0.0',
			//debug: true,
			protocol: 'https',
			host: 'api.github.com',
			timeout: 5000,
			headers: {
				'user-agent': 'doclets'
			}

		});
		github.authenticate({
			type: 'basic',
			username: config.user,
			password: config.password
		});
		github.repos.createHook({
			user: config.owner,
			repo: config.repository,
			name: 'web',
			activate: true,
			events: ['push', 'create'],
			config: {
				secret: '12345678',
				url: webhookUrl,
				'content_type': 'json'
			}
		}, function (err, res) {
			if (err) {
				try {
					err = JSON.parse(err.message).message;
				} catch (_) {
					err = err.message;
				}
				logerr(err);
			} else {
				log('Webhook successfully added'.green);
			}
		});
	};

	var initSchema = {
		properties: {
			user: {
				description: 'GitHub user name',
				required: true,
				default: repoOwner
			},
			password: {
				description: 'GitHub user password',
				hidden: true,
				required: true
			},
			repository: {
				description: 'GitHub repository name',
				required: true,
				default: repoName.sync()
			},
			owner: {
				description: 'GitHub repository owner',
				required: true,
				default: repoOwner
			}
		}
	};
	prompt.get(initSchema, function (err, result) {
		if (err) {
			console.error('Sorry, information not complete'.red);
			process.exit(1);
		} else {
			setupRepo(result);
		}
	});
};

var config = function () {

	var writeConfigYaml = function (inputs) {
		var config = {};
		config.name = inputs.name;
		config.dir = inputs.dir;
		config.flavor = 'jsdoc';
		if (inputs.readme && inputs.readme !== '') {
			config.articles = [];
			var articleEntry = {};
			articleEntry[inputs.readme] = 'README.md';
			config.articles.push(articleEntry);
		}
		fs.writeFileSync('.autodoc.yml', yaml.dump(config));
		log('.autodoc.yml created'.green);
		log('commit and push to generate initial documentation'.green);
	};

	var configDefaults = getDefaultConfig();
	var configSchema = {
		properties: {
			name: {
				description: 'The project name to appear on doclets.io',
				required: true,
				default: configDefaults.name
			},
			dir: {
				description: 'Root folder of source code',
				default: configDefaults.main || 'lib'
			}
		}
	};

	try {
		fs.accessSync('README.md');
		configSchema.properties.readme = {
			description: 'Title of README.md article',
			default: 'Readme',
			required: true
		};

	} catch (err) {
		console.log('no readme');
	}

	prompt.get(configSchema, function (err, result) {
		if (err) {
			console.error('Sorry, information not complete'.red);
			process.exit(1);
		} else {
			writeConfigYaml(result);
		}
	});
};


var preview = function () {
	var configDefaults = getDefaultConfig();
	var repoOwner
	if (configDefaults.repository && configDefaults.repository.url) {
		var match = configDefaults.repository.url.match(/github\.com\/([^\/]+)\/.*/);
		if (match) {
			repoOwner = match[1];
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
	};
	prompt.get(previewSchema, function (err, result) {
		if (err) {
			console.error('Sorry, information not complete'.red);
			process.exit(1);
		} else {
			var githubUrl = 'https://github.com/' + result.owner + '/' + result.repository;
			var db = require('../lib/db-fake');
			var server = require('../lib/server');
			server.init(result.port, db);
			var docData = gather.gatherDocletsAndMeta('./', githubUrl, 'demo');
			db.put(result.owner + '/' + result.repository, 'demo', docData, function () {});
			log('finished'.yellow);
			log('starting webserver...'.yellow);
		}
	});
};

var commands = {
	init: initRepo,
	config: config,
	preview: preview
};

var command = process.argv[2];

if (!command || Object.keys(commands).indexOf(command) === -1) {
	console.log('usage: doclets init | config | preview'.yellow);
	process.exit(1);
}

prompt.start();
commands[command]();