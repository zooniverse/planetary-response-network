global.XMLHttpRequest = require('xmlhttprequest-cookie').XMLHttpRequest
var PanoptesClient    = require('panoptes-client')
var basicCSV          = require('basic-csv')
var async             = require('async')
var path              = require('path')

/* SET ZOONIVERSE CREDENTIALS IN ENV */
zooniverse_username = process.env.ZOONIVERSE_USERNAME
zooniverse_password = process.env.ZOONIVERSE_PASSWORD

/* ZOONIVERSE PROJECT BUILDER */
var project_id     = '2035'
var subject_set_id = '3450'

var manifest_file = 'data/manifest.csv'
var path = path.dirname(manifest_file)

// instantiate new client
var client = new PanoptesClient({
  appID:  process.env.PANOPTES_APP_ID,
  secret: process.env.PANOPTES_SECRET,
  host: 'https://panoptes.zooniverse.org'
});

console.log('client = ', client);
var api = client.api;
var auth = api.auth;
var credentials = {
  login: zooniverse_username,
  password: zooniverse_password
};

readSubjects(manifest_file)

function readSubjects(manifest_file){
  console.log('readSubjects()');
  basicCSV.readCSV( manifest_file, { dropHeader: false }, function(error, rows) {
    if (error) console.error(error)
    handleSubjects(rows)
  })
}

function handleSubjects(rows){
  console.log('handleSubjects()');
  if (rows === null){
    console.error('Error: There was a problem reading the manifest file.')
    return
  }

  var headers = rows[0]
  var subjects = []

  for(var i=1; i<rows.length; i++){ // note: skip first row (csv header)
    var currentRow = rows[i]
    var location  = currentRow[headers.indexOf('image_file')]
    var metadata = {}
    var newSubject = createSubject(location, metadata)
    subjects.push( newSubject )
    // console.log('SUBJECT: ', location)
  }
  console.log("Saving ", subjects.length, " subjects.")
  // console.log('group = ')
  saveSubjects(subjects)
}

function saveSubjects(subjects){
  console.log('saveSubjects()');

  // api.update({'params.admin': true});
  auth.signIn(credentials).then(function(){

    var delay = 0;
    for(var i=0; i<subjects.length; i++){
      subject = subjects[i];
      delay += 1000;
      console.log('SAVING SUBJECT ', subject);
      setTimeout(function(subject) {
        return function() {
          api.type('subjects').create(subject).save()
            .then(function(subject){
             console.log("ZOONIVERSE_ID," + subject.metadata.group_key + ','  + subject.metadata.order + ',' + subject.toJSON().id );
            })
            .catch(function(error) {
             console.log("Error saving subject data! ", error);
             process.exit(1);
            })
          // console.log('SUBJECT: ', subject);
          // console.log("ZOONIVERSE_ID," + subject.metadata.group_key + ','  + subject.metadata.order + ',' );
        }
      }(subject), delay);
    }
  });
}


function createSubject(location, metadata){
  console.log('createSubject()');
  subject = {
  	locations: [
      { 'image/jpeg': location },
    ],
  	metadata: metadata,
  	links:{
  		project: project_id,
      subject_sets: [subject_set_id]
  	}
  }
  return subject
}
