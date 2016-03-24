var mongoose = require('mongoose')
var User = require('../lib/models/user')
var Repo = require('../lib/models/repo')
var Doclet = require('../lib/models/doclet')

mongoose.connect('mongodb://192.168.99.100/app', function () {
  /*
  User.find({}, function (err, users) {
    console.log(users.map(function (user) {return user._accessibleRepos}))
  	}) */
  Repo.remove({}, function () {})
  User.remove({}, function () {})
  Doclet.remove({}, function () {})
  /* Repo.find({}, function (err, repos) {
    console.log(repos.map(function (repo) {return repo._id}))
  	}) */
  setTimeout(function () {}, 3000)
})
