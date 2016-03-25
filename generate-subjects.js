'use strict';
const yargs         = require('yargs');
const AOI           = require('./modules/aoi');
const Mosaic        = require('./modules/mosaic');
const Manifest      = require('./modules/manifest');
const Status        = require('./modules/status');

// for Sentinel-2 data
const utmObj = require('utm-latlng');
const mgrs   = require('mgrs');

// Go
const argv = yargs
  .usage('$0 [options] <kml_file>')
  .describe('job-id',        'Unique job identifier')
  .describe('provider',      'Tile provider to use')
  .describe('mosaics',       'Space-separated urls of mosaics to use')
  .describe('project',       'ID of target project')
  .describe('subject-set',   'ID of target subject set')
  .default('provider',       'planet-api')
  .choices('provider',       ['planet-api', 'sentinel-2'])
  .demand([
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

const redisHost = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379
};

// Instantiate script status tracker
const status = new Status(argv.jobId, redisHost);

// Create mosaic instances from provided URLs
switch (argv.provider){
  case 'planet-api':
    console.log('Using mosaic provider \'%s\'', argv.provider);
    fetchPlanetData();
    break;
  case 'sentinel-2':
    console.log('Using mosaic provider \'%s\'', argv.provider);
    fetchSentinelData(aoi.bounds);
    break;
  default:
    console.log('ERROR: Invalid provider \'%s\'', argv.provider);
}

// Fetches data from Planet Labs API
function fetchPlanetData() {
  const mosaics = argv.mosaics.map((mosaic, i) => {
    return new Mosaic(argv.provider, 'image' + (i + 1), mosaic, status);
  });

  // Create and upload subjects
  const manifest = new Manifest(mosaics, aoi, argv.project, argv.subjectSet, status);

  manifest.deploy((err, result) => {
    if (err) throw err;
    this.status.update('deploying_subjects', 'done');
    console.log('Finished uploading subjects.');
  });
}

// Fetches data from Sinergise/ESA Sentinel 2 API

function fetchSentinelData(bounds) {
  console.log('Fetching Sentinel-2 data...');
  console.log('BOUNDS: ', bounds);

  for(let coord of bounds) {
    console.log('------------------------');
    console.log('COORD: ', coord);
    console.log('MGRS : ', mgrs.forward(coord));
  }

  process.exit(0);
}




// const AWS    = require('aws-sdk');
// const utmObj = require('utm-latlng');
//
//
// var s3 = new AWS.S3({
//   region: 'eu-central-1',
//   params: { Bucket: 'sentinel-s2-l1c' }
// });
//
// s3.listObjects( { Prefix: 'tiles', Marker: '.jp2' }, function(err, data) {
//   if (err) console.log(err, err.stack);
//   else {
//     console.log(data);
//   }
// });
//
//
// // var utm=new utmObj('WGS 84');
// // var coords = utm.convertUtmToLatLng(300000.0, 2990220.0 , 45, 'R')
// // console.log('COORDINATES: ', coords.lat, coords.lng )
