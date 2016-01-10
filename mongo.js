var mongoose = require('mongoose')
var Repo = require('./lib/models/repo')
var User = require('./lib/models/user')

mongoose.connect('mongodb://192.168.99.100')

mongoose.connection.on('err', function (err) {
  console.log('err', err)
})

mongoose.connection.on('open', function () {
  /*  console.log('connected')
  Repo.findOne({name: 'node-jet'})
    .populate('_owner')
    .exec(function (err, repo) {
      console.log(err, repo)

      repo.changeWebHook(false, function (err) {
        console.log(err, 'asd')
      })
  		}) */
  User.remove({}, function (err, re) {
    console.log(err, re)
  })
})
