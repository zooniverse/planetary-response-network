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

function saveSubjects(subjects, callback){
  var auth = panoptesClient.auth
  var credentials = {
    login: process.env.ZOONIVERSE_USERNAME,
    password: process.env.ZOONIVERSE_PASSWORD
  };

  // api.update({'params.admin': true});  // careful when using admin mode!
  auth.signIn(credentials).then(function(user){
    // console.log('Signed in user: ', user);
    async.eachSeries(subjects, saveSubject, callback)
  });
}
