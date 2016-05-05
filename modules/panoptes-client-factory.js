'use strict';
const request = require('request');
const JsonApiClient = require('json-api-client');

var DEFAULT_ENV = 'staging';

var API_HOSTS = {
  production: 'https://www.zooniverse.org',
  staging: 'https://panoptes-staging.zooniverse.org',
  development: 'https://panoptes-staging.zooniverse.org',
};

var OAUTH_HOSTS = {
  production: 'https://panoptes.zooniverse.org',
  staging: 'https://panoptes-staging.zooniverse.org',
  development: 'https://panoptes-staging.zooniverse.org',
};

var hostFromShell = process.env.PANOPTES_API_HOST;
var appFromShell = process.env.PANOPTES_API_APPLICATION;
var envFromShell = process.env.NODE_ENV;

var env = envFromShell || DEFAULT_ENV;

if (!env.match(/^(production|staging|development)$/)) {
  throw new Error('Panoptes Javascript Client Error: Invalid Environment; ' +
    'try setting NODE_ENV to "staging" instead of "'+envFromShell+'".');
}

const config = {
  host: hostFromShell || API_HOSTS[env],
  oauthHost: OAUTH_HOSTS[env]
};

// How many seconds before expiry to consider refreshing access tokens
const REFRESH_TOKEN_BUFFER = 900;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};


/**
 * @classdesc Allows creating per-user api clients
 */
class PanoptesClientFactory {
  constructor() {
    this.config = config;
    /**
     * @type {Object}
     * Stores api client instances by user ID
     */
    this.clients = {};
  }

  /**
   * Creates an api client for a user if none exists
   * @param {User}
   * @return {JsonApiClient}
   */
  getClientForUser(user) {
    const userId = user.get('id');
    if (!this.clients[userId]) {
      let client = new JsonApiClient(config.host + '/api', {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.api+json; version=1'
      });
      this.clients[userId] = client;
    }
    return new Promise((resolve, reject) => {
      ensureAccessToken(user, (err, user) => {
        this.clients[userId].headers['Authorization'] = 'Bearer ' + user.get('accessToken');
        resolve(this.clients[userId]);
      });
    });
  }
}

/**
 * Checks whether a user's access token is expired or near expiry and refreshes it if so
 * @param  {User}      user
 * @param  {Function}  done  Callback
 */
function ensureAccessToken(user, done) {
  const now = new Date().getTime() / 1000;
  if (parseInt(user.get('accessTokenExpiresAt')) - REFRESH_TOKEN_BUFFER < now) {
    // Access token has expired or will expire soon; refresh it
    let data = {
      grant_type: 'refresh_token',
      refresh_token: user.get('refreshToken'),
      client_id: process.env.PANOPTES_API_APPLICATION,
    };

    request.post({
      url: config.host + '/oauth/token',
      headers: JSON_HEADERS,
      body: JSON.stringify(data)
    }, (err, res, body) => {
      if (err) return done(err);
      body = JSON.parse(body);
      user.update({
        accessToken: body.access_token,
        accessTokenExpiresAt: body.created_at + body.expires_in,
        refreshToken: body.refresh_token
      }, err => {
        done(err, user);
      });
    })
  } else {
    setImmediate(() => done(null, user));
  }
}

module.exports = new PanoptesClientFactory();