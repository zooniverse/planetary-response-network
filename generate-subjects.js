'use strict';
const yargs         = require('yargs');
const AOI           = require('./modules/aoi');
const Mosaic        = require('./modules/mosaic');
const Manifest      = require('./modules/manifest');
const Status        = require('./modules/status');

// for Sentinel-2 data
const utmObj   = require('utm-latlng');
const mgrs     = require('mgrs');
const sentinel = require('./modules/sentinel-api');


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
    var params = {
      bounds: aoi.bounds,
      cloudcoverpercentage: '[0 TO 50]',
      platformname: 'Sentinel-2'
    }
    sentinel.fetchDataFromCopernicus(params, function(downloadList) {
      console.log('RESULT: ', downloadList);
      process.exit(0);
    });
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
