var mongoose = require('mongoose')
var repoModule = require('../repo')

var Schema = mongoose.Schema
var userSchema = new Schema({
  _id: String, // lipp
  passportId: String, // 123765
  name: String,
  email: String,
  url: String,
  token: String,
  refreshToken: String,
  image: String,
  company: String,
  location: String,
  bio: String,
  type: String,
  createdAt: Date,
  needsReauth: Boolean
})

userSchema.statics.createFromGitHubPassport = function (ghPassport, done) {
  var gh = ghPassport.profile._json
  var user = new User({
    createdAt: new Date(),
    _id: ghPassport.profile.username,
    passportId: ghPassport.profile.id,
    name: ghPassport.profile.displayName,
    email: gh.email,
    url: gh.html_url,
    token: ghPassport.token,
    refreshToken: ghPassport.refreshToken,
    image: gh.avatar_url
  })
  user.save(done)
}

userSchema.methods.syncWithGitHub = function (done) {
  var user = this
  if (!user.createdAt) {
    user.createdAt = new Date()
  }
  repoModule.getUser({type: 'oauth', token: user.token}, function (err, ghUser) {
    if (err) {
      if (err.code === 401) {
        user.needsReauth = true
        done(null, user)
      } else {
        done(err)
      }
    } else {
      var entries = ['email', 'name', 'company', 'blog', 'location', 'bio']
      entries.forEach(function (entry) {
        user[entry] = ghUser[entry]
      })
      user.needsReauth = false
      user.save(function (err) {
        if (err) {
          done(err)
        } else {
          done(null, user)
        }
      })
    }
  })
}

var User = mongoose.model('User', userSchema)

module.exports = User
