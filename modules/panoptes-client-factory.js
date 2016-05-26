'use strict';
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
      client.headers['Authorization'] = 'Bearer ' + user.get('accessToken');
      this.clients[userId] = client;
    }
    return this.clients[userId];
  }
}

module.exports = new PanoptesClientFactory();