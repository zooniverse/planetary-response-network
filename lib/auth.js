'use strict';
module.exports = app => {
  const async = require('async');
  const redis = require('./redis');
  const session = require('express-session');
  const RedisStore = require('connect-redis')(session);
  const request = require('request');
  const passport = require('passport');
  const OAuth2Strategy = require('passport-oauth2');
  const bodyParser = require('body-parser');
  const cookieParser = require('cookie-parser');
  const User = require('./user-model.js');
  const panoptesClient = require('panoptes-client');
  const OAUTH_CONFIG = {
    authorizationURL: panoptesClient._config.host+'/oauth/authorize',
    tokenURL: panoptesClient._config.host+'/oauth/token',
    clientID: process.env.PANOPTES_API_APPLICATION,
    clientSecret: process.env.PANOPTES_API_SECRET,
    callbackURL: process.env.PRN_CALLBACK_URI || 'https://localhost:3736/auth/callback'
  };

  // Store user session in redis
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
  // Handle request bodies and cookies
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Setup Panoptes oauth code flow via passport
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) =>
    done(null, user.get('id'))
  );
  passport.deserializeUser((id, done) =>
    User.find(id, (err, user) => {
      done(err, user);
    })
  );

  const oauth2Strategy = new OAuth2Strategy(OAUTH_CONFIG, handleOauthResponse);
  passport.use(oauth2Strategy);

  // Setup login/oauth routes
  // Login
  app.get('/auth/login', passport.authenticate('oauth2'));
  // Oauth callback
  app.get(
    '/auth/callback',
    passport.authenticate('oauth2'),
    (req, res) => res.send(req.user.toJson())
  );
  // Profile
  app.get('/auth/me', (req, res) => res.send(req.user.toJson()));

  /**
   * Updates our local user with the token and profile data from Panoptes' oauth response
   * @param {String}    accessToken        the user's access token
   * @param {String}    refreshToken       the user's refresh token
   * @param {Object}    params             data about the tokens
   * @param {Number}    params.created_at  access token creation timestamp
   * @param {Number}    params.expires_in  access token validity lifetime, in seconds
   * @param {Object}    profile            empty - Panoptes doesn't return a profile here
   * @param {Function}  done               callback
   */
  function handleOauthResponse(accessToken, refreshToken, params, profile, done) {
    // Panoptes doesn't include profile in oauth response; fetch now
    const userData = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      accessTokenExpiresAt: params.created_at + params.expires_in
    };

    async.waterfall([
      async.apply(getUserFromAccessToken, accessToken),
      (user, done) => user.update(userData, done)
    ], done);
  }

  /**
   * Uses an access token to get a local user
   * @param {String}   accessToken
   * @param {Function} done
   */
  function getUserFromAccessToken(accessToken, done) {
    // TODO can we query redis for the user with the access token (i.e. bypass Panoptes)?
    getPanoptesProfileFromAccessToken(accessToken, (err, profile) => {
      User.findOrCreate(profile.id, done);
    });
  }

  /**
   * Uses an access token to get the user's profile from Panoptes
   * @param {String}   accessToken
   * @param {Function} done
   */
  function getPanoptesProfileFromAccessToken(accessToken, done) {
    request.get(panoptesClient._config.host+'/api/me', {
      auth: {
        bearer: accessToken
      },
      headers: {
        Accept: 'application/vnd.api+json; version=1'
      }
    }, (err, res, body) => {
      if (err) return done(err);

      try {
        body = JSON.parse(body);
      } catch(e) {
        done(e);
      }

      done(null, body.users[0]);
    });
  }
};