global.XMLHttpRequest = require('xmlhttprequest-cookie').XMLHttpRequest
var panoptesClient    = require('panoptes-client')
<<<<<<< HEAD
=======

var auth = panoptesClient.auth
var api  = panoptesClient.apiClient
// var talkClient = panoptesClient.talkClient
>>>>>>> 02d509c... fix panoptes-client

exports.saveSubjects = saveSubjects

function saveSubjects(subjects, callback){

  var auth = panoptesClient.auth
  var api  = panoptesClient.apiClient
  var credentials = {
    login: process.env.ZOONIVERSE_USERNAME,
    password: process.env.ZOONIVERSE_PASSWORD
  };

<<<<<<< HEAD
  api.update({'params.admin': true});
  auth.signIn(credentials).then(function(){
=======
  // api.update({'params.admin': true});  // careful when using admin mode!
  auth.signIn(credentials).then(function(user){
    // console.log('Signed in user: ', user);
>>>>>>> 02d509c... fix panoptes-client
    var delay = 0;
    for(var i=0; i<subjects.length; i++){
      subject = subjects[i];
      delay += 1000;
      setTimeout(function(subject) { // Let's not overwhelm the API
        return function() {
          api.type('subjects').create(subject).save()
            .then(function(subject){
             console.log("Subject created: ," + JSON.stringify(subject) ); // DEBUG CODE
             callback(null, subject)
            })
            .catch(function(error) {
             console.log("Error saving subject data! ", error);
             callback(error)
            })
        }
      }(subject), delay);
    }
  });
}
