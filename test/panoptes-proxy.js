'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const panoptes = require('panoptes-client');
const panoptesProxy = require('../middleware/panoptes-proxy');

describe('Panoptes proxy middleware', () => {
  // Stub apiClient
  let apiClientOrig = panoptes.apiClient;
  let getSpy = sinon.spy();
  panoptes.apiClient = {
    headers: {}
  };

  describe('getProjects', () => {
    it('should use the current user\'s access token', function () {
      let req = {
        user: {
          accessToken: 'ACCESS_TOKEN',
          displayName: 'Emily'
        }
      };
    });

  });

  // Restore apiClient
  panoptes.apiClient = apiClientOrig;
  console.log(panoptes.apiClient)

});