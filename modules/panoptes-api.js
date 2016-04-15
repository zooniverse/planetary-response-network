'use strict';
global.XMLHttpRequest = require('xmlhttprequest-cookie').XMLHttpRequest
var panoptesClient    = require('panoptes-client')
var async             = require('async')

var auth = panoptesClient.auth
var api  = panoptesClient.apiClient
// var talkClient = panoptesClient.talkClient

exports.saveSubjects = saveSubjects

function saveSubject(subject, callback) {
  var api  = panoptesClient.apiClient
  api.type('subjects').create(subject).save()
    .then(function(subject){
      console.log("Subject created: ,", subject ); // DEBUG CODE
      callback(null, subject)
    })
    .catch(function(error) {
      callback(error);
    })
}

function saveSubjects(user, subjects, callback){
  // Inject our access token into api client
  api.headers.Authorization = 'Bearer ' + user.get('accessToken')

  // api.update({'params.admin': true});  // careful when using admin mode!
  async.eachSeries(subjects, saveSubject, (err, result) => {
    // Clear access token
    api.headers.Authorization = null
    callback(err, result)
  })
}
