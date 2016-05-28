'use strict';

const async                 = require('async');
const redis                 = require('./redis');
const session               = require('express-session');
const RedisStore            = require('connect-redis')(session);
const request               = require('request');
const passport              = require('passport');
const OAuth2Strategy        = require('passport-oauth2');
const bodyParser            = require('body-parser');
const cookieParser          = require('cookie-parser');
const User                  = require('./user-model.js');
const panoptesClientFactory = require('../modules/panoptes-client-factory');
const config                = require('../config.js');

const host = config.host || 'https://localhost:3736';

const OAUTH_CONFIG = {
  authorizationURL: panoptesClientFactory.config.oauthHost+'/oauth/authorize',
  tokenURL: panoptesClientFactory.config.oauthHost+'/oauth/token',
  clientID: process.env.PANOPTES_API_APPLICATION,
  clientSecret: process.env.PANOPTES_API_SECRET,
  callbackURL: host+'/auth/callback'
};
const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

function setupMiddlewares(app) {
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
  app.get('/auth/login', (req, res, next) => {
    if (req.query.redirect) {
      req.session.redirect = req.query.redirect;
    }
    next();
  }, passport.authenticate('oauth2'));
  // Logout
  app.get('/auth/logout', (req, res, next) => {
    req.session.destroy();
    if (req.query.redirect) {
      res.redirect(req.query.redirect);
    } else {
      res.status(204);
      res.send();
    }
  });
  // Oauth callback
  app.get(
    '/auth/callback',
    passport.authenticate('oauth2'),
    (req, res) => {
      if (req.session.redirect) {
        res.redirect(req.session.redirect);
        req.session.redirect = null;
      } else {
        res.send(req.user.toJson());
      }
    }
  );
  // Profile
  app.get('/auth/me', ensureLogin, (req, res) => {
    const profile = req.user.toJson();
    delete profile.accessToken;
    delete profile.accessTokenExpiresAt;
    delete profile.refreshToken;
    res.send(profile);
  });
}

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
    async.apply(getPanoptesProfileFromAccessToken, accessToken),
    (profile, done) => {
      getUserFromAccessToken(accessToken, (err, user) => {
        userData.username = profile.login;
        userData.displayName = profile.display_name;
        user.update(userData, done);
      });
    }
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
  request.get(panoptesClientFactory.config.host+'/api/me', {
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

function ensureLogin(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.status(401);
    res.send('You are not logged in');
  }
}

module.exports = { setupMiddlewares, ensureLogin };
