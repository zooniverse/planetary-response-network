'use strict';
const yargs         = require('yargs');
const AOI           = require('./modules/aoi');
const Mosaic        = require('./modules/mosaic');
const Manifest      = require('./modules/manifest');
const Status        = require('./modules/status');
const redis         = require('./lib/redis');
const redisPubSub   = require('./lib/redis-pubsub');
const User          = require('./lib/user-model');

// for Sentinel-2 data
const utmObj   = require('utm-latlng');
const mgrs     = require('mgrs');
const Sentinel = require('./modules/sentinel-api');


// Go
const argv = yargs
  .usage('$0 [options] <file>')
  .describe('job-id',        'Unique job identifier')
  .describe('provider',      'Tile provider to use')
  .describe('mosaics',       'Space-separated urls of mosaics to use')
  .describe('images',        'Space-separated paths to images to use')
  .describe('equalize',      'Equalize historgam to stretch contrast')
  .describe('labels',        'Space-separated list of labels to overlay on tiles (first label will be used for tiles from first image/mosaic, and so on)')
  .describe('label-pos',     'Compass point to anchor labels to')
  .describe('tile-size',     'Square size of tiles')
  .describe('tile-overlap',  'How much to overlap tiles by (in x and y)')
  .describe('project',       'ID of target project')
  .describe('subject-set',   'ID of target subject set')
  .describe('user-id',       'ID of Panoptes user to run job as')
  .describe('aoi',          'KML file containing an area of interest for mosaic provider')
  .default('tile-size',      480)
  .default('tile-overlap',   160)
  .default('equalize',       false)
  .choices('provider',       ['planet-api', 'sentinel-2', 'file'])
  .default('provider',       'planet-api')
  .default('label-pos',      'south')
  .implies('mosaics', 'aoi')
  .implies('aoi', 'mosaics')
  .demand([
    'project',
    'subject-set'
  ])
  .array('mosaics')
  .array('images')
  .array('labels')
  .check(argv => {
    if (argv.mosaics && argv.labels && argv.mosaics.length != argv.labels.length) {
      throw new Error('If supplying mosaic labels, the number of labels must match the number of mosaics');
    }
    if (argv.images && argv.labels && argv.images.length != argv.labels.length) {
      throw new Error('If supplying image labels, the number of labels must match the number of images');
    }
    if (argv.images && argv.mosaics) {
      throw new Error('Please specify either images or mosaics, but not both');
    }
    return true;
  })
  .argv;


console.log('ARGV = ', argv);

let aoi;
if (argv.provider !== 'file') {
  // Load AOI
  const file = argv.aoi;
  aoi = new AOI(file);
  console.log('Loading AOI from KML file', file);
}

const manifestFile = 'data/'+new Date().getTime()+'.csv';

// Instantiate script status tracker
const status = new Status(argv.jobId);

// Create mosaic instances from provided URLs
switch (argv.provider){
  case 'file':       fetchPlanetData(); break;    // use local file source
  case 'planet-api': fetchPlanetData(); break;    // use Planet Labs API (S3 bucket)
  case 'sentinel-2': fetchSentinelData(); break;  // use Sentinel-2 data (S3 bucket)
  default: console.log('ERROR: Invalid provider \'%s\'', argv.provider);
}

// Fetches data from Planet Labs API
function fetchPlanetData() {
  console.log('Using mosaic provider \'%s\'', argv.provider);
  const status = new Status(argv.jobId);

  let mosaics;
  if (argv.provider !== 'file') {
    // Create mosaic instances from provided URLs
    mosaics = argv.mosaics.map((mosaic, i) => {
      return new Mosaic({
        provider: argv.provider,
        url: mosaic,
        tileSize: argv.tileSize,
        tileOverlap: argv.tileOverlap,
        imOptions: {
          equalize: argv.equalize,
          label: argv.labels ? argv.labels[i] : null, // 'image' + (i + 1), // Todo: maybe enable this for a future auto-label option?
          labelPos: argv.labelPos
        },
        status: status
      });
    });
  }

  // Get user
  User.find(argv.userId, (err, user) => {
    if (err) throw err;
    // Create and upload subjects
    let args = {
      projectId: argv.project,
      subjectSetId: argv.subjectSet,
      status: status,
      user: user
    }
    if (argv.provider === 'file') {
      args.images = argv.images;
      args.equalize = argv.equalize;
      if (argv.labels) args.labels = argv.labels;
      args.labelPos = argv.labelPos;
      args.tileSize = argv.tileSize;
      args.tileOverlap = argv.tileOverlap;
    } else {
      args.mosaics = mosaics;
      args.aoi = aoi;
    }
    const manifest = new Manifest(args);

    manifest.deploy((err, result) => {
      if (err) {
        console.error(err);
        process.exit(1);
      } else {
        status.update('finished', 'done');
        console.log('Finished uploading subjects.');
        process.exit(0);
      }
    });
  })
}

function fetchSentinelData() {
  console.log('Using mosaic provider \'%s\'', argv.provider);

  // /* USE COPERNICUS API */
  // var params = { bounds: aoi.bounds, cloudcoverpercentage: '[0 TO 50]', platformname: 'Sentinel-2' };
  // require('./modules/sentinel-api').fetchDataFromCopernicus(params, function(err,result) {
  // }); // METHOD #1

  const sentinel = new Sentinel(aoi, argv.project, argv.subjectSet, status);
  sentinel.fetchData( function(err, result) {
    sentinel.processData( function(err, result) {
      if(err) throw err;
      console.log('RESULT: ', result);
      process.exit(0);
    });
  });
}
