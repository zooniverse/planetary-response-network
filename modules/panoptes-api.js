'use strict';
global.XMLHttpRequest = require('xmlhttprequest-cookie').XMLHttpRequest
var async             = require('async')
var apiFactory        = require('./panoptes-client-factory')

exports.saveSubjects = saveSubjects

function saveSubject(user, subject, callback) {
  var api  = apiFactory.getClientForUser(user);
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
  // api.update({'params.admin': true});  // careful when using admin mode!
  async.eachSeries(subjects, async.apply(saveSubject, user), callback)
}
