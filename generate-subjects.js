'use strict';
const yargs         = require('yargs');
const AOI           = require('./modules/aoi');
const Mosaic        = require('./modules/mosaic');
const Manifest      = require('./modules/manifest');
const Status        = require('./modules/status');
const redis         = require('./lib/redis');
const redisPubSub   = require('./lib/redis-pubsub');
const User          = require('./lib/user-model');

// Go
const argv = yargs
  .usage('$0 [options] <file>')
  .describe('job-id',        'Unique job identifier')
  .describe('provider',      'Tile provider to use')
  .describe('mosaics',       'Space-separated urls of mosaics to use')
  .describe('images',        'Space-separated paths to images to use')
  .describe('labels',        'Space-separated list of labels to overlay on tiles (first label will be used for tiles from first image/mosaic, and so on)')
  .describe('label-pos',     'Compass point to anchor labels to')
  .describe('tile-size',     'Square size of tiles')
  .describe('tile-overlap',  'How much to overlap tiles by (in x and y)')
  .describe('project',       'ID of target project')
  .describe('subject-set',   'ID of target subject set')
  .describe('user-id',       'ID of Panoptes user to run job as')
  .default('tile-size', 480)
  .default('tile-overlap', 160)
  .choices('provider',       ['planet-api', 'file'])
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

let mosaics;
if (argv.provider !== 'file') {
  // Create mosaic instances from provided URLs
  mosaics = argv.mosaics.map((mosaic, i) => {
    let label = argv.mosaicLabels ? argv.mosaicLabels[i] : 'image' + (i + 1);
    return new Mosaic({
      provider: argv.provider,
      label: label,
      showLabels: argv.mosaicLabels,
      labelPos: argv.labelPos,
      url: mosaic,
      tileSize: argv.tileSize,
      tileOverlap: argv.tileOverlap,
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
    args.labels = argv.labels;
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
