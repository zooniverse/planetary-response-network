'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const JsonApiClient = require('json-api-client');
const panoptesClientFactory = require('../modules/panoptes-client-factory');
const User = require('../lib/user-model');

describe('Panoptes client factory', () => {
  const user = User.create({
    id: 1,
    accessToken: 'ACCESS_TOKEN',
    displayName: 'Emily',
  });
  const client = panoptesClientFactory.getClientForUser(user);

  it('should create a new client for the user', (done) => {
    expect(client).to.be.an.instanceOf(JsonApiClient);
    done();
  });

  it('should set the access token based on the current user', (done) => {
    expect(client.headers['Authorization']).to.equal('Bearer ACCESS_TOKEN');
    done();
  });

});