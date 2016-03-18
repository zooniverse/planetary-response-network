'use strict';
const fs            = require('fs');
const async         = require('async');
const yargs         = require('yargs');
const csvStringify  = require('csv-stringify');
const parseCsv      = require('csv-parse')
const AOI           = require('./modules/aoi');
const Mosaic        = require('./modules/mosaic');
const imgMeta       = require('./modules/image-meta');
const Manifest      = require('./modules/manifest');
const uploadToS3    = require('./modules/upload-to-s3.js');
const panoptesAPI   = require('./modules/panoptes-api.js');

// Go
const argv = yargs
  .usage('$0 [options] <kml_file>')
  .describe('provider',      'Tile provider to use')
  .describe('mosaics',       'Space-separated urls of mosaics to use')
  .describe('s3-bucket',     'Name of S3 bucket in which to store tiles')
  .describe('project',       'ID of target project')
  .describe('subject-set',   'ID of target subject set')
  .default('provider',       'planet-api')
  .choices('provider',       ['planet-api'])
  .demand([
      's3-bucket',
      'project',
      'subject-set'
  ])
  .array('mosaics')
  .demand(1)
  .argv;

// Load AOI
const file = argv._[0];
console.log('Loading AOI from KML file', file);
const aoi = new AOI(file);
const manifestFile = 'data/'+new Date().getTime()+'.csv';

// Create mosaic instances from provided URLs
const mosaics = argv.mosaics.map((mosaic, i) => {
  return new Mosaic('image' + (i + 1), mosaic);
});

// Fetch imagery
async.mapSeries(mosaics, (mosaic, callback) => {
  mosaic.createTilesForAOI(aoi, callback);
}, (err, filesByMosaic) => {
  if (err) throw err;
  // Generate manifest
  const manifest = new Manifest(mosaics, argv.project, argv.subjectSet, filesByMosaic);
  manifest.getSubjects((err, subjects) => {
    if (err) throw err;

    deployPanoptesSubjects(subjects, argv.project, argv.subjectSet, (err, result) => {
      if (err) throw err;
      console.log('Finished uploading subjects.');
    });
  });
});

function deployPanoptesSubjects(subjects, project_id, subject_set_id, callback){
  async.waterfall([
    async.apply(uploadSubjectImages, subjects),
    panoptesAPI.saveSubjects
  ], callback);
}

function uploadSubjectImages(subjects, callback){
  console.log('Uploading images...');
  async.mapSeries(subjects, uploadSubjectImagesToS3, callback);
}

function uploadSubjectImagesToS3(subject, callback){
  async.series(argv.mosaics.map((mosaic, i) => {
    const img = subject.locations[i]['image/jpeg'];
    return async.apply( uploadToS3, img, img, argv.s3Bucket );
  }), function(err, results) {
    if (err) return callback(err)
    // replace local filename with image url
    results.forEach((result, i) => {
      subject.locations[i]['image/jpeg'] = result;
    });
    callback(null, subject);
  });
}