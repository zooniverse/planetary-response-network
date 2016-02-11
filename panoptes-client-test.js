global.XMLHttpRequest = require('xmlhttprequest-cookie').XMLHttpRequest
var panoptesClient = require('panoptes-client')

// project info for planetary response network
var project_id     = '2035'
var subject_set_id = '3679'

var auth = panoptesClient.auth
var api  = panoptesClient.apiClient
// var talkClient = panoptesClient.talkClient // we do not need this

var credentials = {
  login: process.env.ZOONIVERSE_USERNAME,
  password: process.env.ZOONIVERSE_PASSWORD
};

var locations = [
    { 'image/jpeg': 'https://panoptes-uploads.zooniverse.org/production/subject_location/776b01e0-b097-49cf-95d9-7d298cafca94.png' },
    { 'image/jpeg': 'https://panoptes-uploads.zooniverse.org/production/subject_location/66610b2e-134e-490c-a0c0-3c21a791298b.png' }
   ]

// this is dummy data
var metadata = {
     upper_left_lon:   '85.25390555555556',
     upper_left_lat:   '27.68352777777778',
     upper_right_lon:  '85.27450483940973',
     upper_right_lat:  '27.68352777777778',
     bottom_right_lon: '85.27450483940973',
     bottom_right_lat: '27.665273546006947',
     bottom_left_lon:  '85.25390555555556',
     bottom_left_lat:  '27.665273546006947',
     center_lon:       '85.26420519748264',
     center_lat:       '27.674400661892363'
 }

var newSubject = createSubject(locations, metadata)

var subjects = []
subjects.push(newSubject)

saveSubjects(subjects)

/* SAVES SUBJECTS */
function saveSubjects(subjects){

  api.update({'params.admin': true});
  auth.signIn(credentials).then(function(){
    // var delay = 1000;
    // for(var i=0; i<subjects.length; i++){
    //   subject = subjects[i];
    //   delay += 0;
    //   setTimeout(function(subject) {
    //     return function() {
    //       api.type('subjects').create(subject).save()
    //         .then(function(subject){
    //          console.log("CREATED SUBJECT: ," + JSON.stringify(subject) );
    //         })
    //         .catch(function(error) {
    //          console.log("Error saving subject data! ", error);
    //          process.exit(1);
    //         })
    //     }
    //   }(subject), delay);
    // }
  });
}

function createSubject(locations, metadata){
  subject = {
  	locations: locations,
  	metadata: metadata,
  	links:{
  		project: project_id,
      subject_sets: [subject_set_id]
  	}
  }
  return subject;
}
