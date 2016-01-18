global.XMLHttpRequest = require('xmlhttprequest-cookie').XMLHttpRequest
var PanoptesClient = require('panoptes-client');
var basicCSV = require('basic-csv');

/* SET ZOONIVERSE CREDENTIALS IN ENV */
zooniverse_username = process.env.ZOONIVERSE_USERNAME
zooniverse_password = process.env.ZOONIVERSE_PASSWORD

/* ZOONIVERSE PROJECT BUILDER */
var project_id     = '816';
var subject_set_id = '1862';

var groups_file = 'groups.csv'
var groups_file_headers = ['order','key','name','mss_number','date_span','description','external_url','cover_image_url'];
var headers = ['order','set_key','file_path','thumbnail','width','height','date_created'];

var count

// instantiate new client
var client = new PanoptesClient({
  appID:  process.env.PANOPTES_APP_ID,
  secret: process.env.PANOPTES_SECRET,
  host: 'https://panoptes.zooniverse.org'
});
var api = client.api;
var auth = api.auth;
var credentials = {
  login: zooniverse_username,
  password: zooniverse_password
};

var subjects = [];

/* begin with reading the groups file */
console.log('Reading groups file...');
var readGroups = new Promise( function(resolve, reject) {
  basicCSV.readCSV( groups_file, { dropHeader: true }, function(error, rows) {
    if(error){
      reject();
    }else{
      resolve(rows);
    }
  })
});

readGroups.then(handleGroups);

setTimeout(function(){
  console.log('SAVING SUBJECTS...', subjects.length);
  // saveSubjects(subjects);
}, 10000);

function handleGroups(rows){
  console.log('handleGroups()');

  for(var i=0; i<rows.length; i++){
    var currentGroupRow = rows[i];
    var group_key  = currentGroupRow[groups_file_headers.indexOf('key')];
    var group_metadata = {
      key:  group_key,
      name: currentGroupRow[groups_file_headers.indexOf('name')],
      description: currentGroupRow[groups_file_headers.indexOf('description')],
      external_url: currentGroupRow[groups_file_headers.indexOf('external_url')]
    }
    var manifest_file = 'group_'+group_key+'.csv';

    /* read manifest file for current group */
    var readSubjects = new Promise( function(resolve, reject) {
      basicCSV.readCSV( manifest_file, { dropHeader: true }, function(error, rows) {
        if (error) {
          reject()
        } else {
          resolve(rows)
        }
      } )
    });

    readSubjects.then( handleSubjects.bind(this, group_metadata) );
  } // end loop
}

function handleSubjects(group_metadata, rows){
  console.log('handleSubjects()');
  // var subjects = [];
  for(var i=0; i<rows.length; i++){

    var currentRow = rows[i];
    var location  = currentRow[headers.indexOf('file_path')];
    var metadata = {
      order: currentRow[headers.indexOf('order')],
      group_key: group_metadata.key,
      group_name: group_metadata.name,
      description: group_metadata.description,
      external_url: group_metadata.external_url
    }
    var newSubject = createSubject(location, metadata);
    subjects.push( newSubject );
    // console.log('SUBJECT: ', location);
  }
  // console.log("Saving ", subjects.length, " subjects.");
  // console.log('group = ');
  // saveSubjects(subjects);
}

/* SAVES SUBJECTS */
function saveSubjects(subjects){

  api.update({'params.admin': true});
  auth.signIn(credentials).then(function(){

    var delay = 0;
    for(var i=0; i<subjects.length; i++){
      subject = subjects[i];
      delay += 1000;
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
  return subject;
}
