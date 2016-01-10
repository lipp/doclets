var mongoose = require('mongoose')

var Schema = mongoose.Schema
var userSchema = new Schema({
  _id: String, // lipp
  passportId: String, // 123765
  name: String,
  email: String,
  url: String,
  token: String,
  image: String
})

userSchema.statics.createFromGitHubPassport = function (ghPassport, done) {
  console.log(ghPassport)
  var gh = ghPassport.profile._json
  var user = new User({
    _id: ghPassport.profile.username,
    passportId: ghPassport.profile.id,
    name: ghPassport.profile.displayName,
    email: gh.email,
    url: gh.html_url,
    token: ghPassport.token,
    image: gh.avatar_url
  })
  user.save(done)
}

var User = mongoose.model('User', userSchema)

module.exports = User
