module.exports = function (app) {

const redis = require('./redis')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const request = require('request');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const User = require('./user-model.js');
const panoptesClient = require('panoptes-client')

app.use(session({
  store: new RedisStore({
    client: redis
  }),
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true
  },
  resave: false,
  saveUninitialized: false
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, done) {
  done(null, user.get('id'));
});

passport.deserializeUser(function(id, done) {
  User.get(id, function(err, user) {
    done(err, user);
  })
});
passport.use(new OAuth2Strategy({
  authorizationURL: panoptesClient._config.host+'/oauth/authorize',
  tokenURL: panoptesClient._config.host+'/oauth/token',
  clientID: process.env.PANOPTES_API_APPLICATION,
  clientSecret: process.env.PANOPTES_API_SECRET,
  callbackURL: "https://localhost:3736/auth/callback"
}, function(accessToken, refreshToken, params, profile, cb) {
  request.get(panoptesClient._config.host+'/api/me', {
    auth: {
      bearer: accessToken
    },
    headers: {
      Accept: 'application/vnd.api+json; version=1'
    }
  }, function (err, res, body) {
    body = JSON.parse(body);
    // Find or create user
    const id = body.users[0].id;
    const userData = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      accessTokenExpiresAt: params.created_at + params.expires_in
    };
    User.get(id, function (err, user) {
      if (!user) {
        userData.id = id;
        user = User.create(userData);
        user.save(function (err) {
          cb(err, user.toJson());
        });
      } else {
        user.set(userData);
        user.save(function (err) {
          cb(err, user);
        });
      }
    });
  });
}));

app.get('/auth/login',
passport.authenticate('oauth2'));

app.get('/auth/callback',
passport.authenticate('oauth2', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/auth/me');
});

app.get('/auth/me', function(req, res) {
  res.send(req.user.toJson());
});

};