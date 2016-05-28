'use strict';
const request = require('request');
const JsonApiClient = require('json-api-client');
const config = require('../config');

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
      let client = new JsonApiClient(config.oauthHost + '/api', {
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
      url: config.oauthHost + '/oauth/token',
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