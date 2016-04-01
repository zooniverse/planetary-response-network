'use strict';
const yargs         = require('yargs');
const AOI           = require('./modules/aoi');
const Mosaic        = require('./modules/mosaic');
const Manifest      = require('./modules/manifest');
const Status        = require('./modules/status');
const redis         = require('./lib/redis');
const redisPubSub   = require('./lib/redis-pubsub');

// Go
const argv = yargs
  .usage('$0 [options] <kml_file>')
  .describe('job-id',        'Unique job identifier')
  .describe('provider',      'Tile provider to use')
  .describe('mosaics',       'Space-separated urls of mosaics to use')
  .describe('project',       'ID of target project')
  .describe('subject-set',   'ID of target subject set')
  .default('provider',       'planet-api')
  .choices('provider',       ['planet-api'])
  .demand([
      'project',
      'subject-set'
  ])
  .array('mosaics')
  .demand(1)
  .argv;

console.log('ARGV = ', argv);

// Load AOI
const file = argv._[0];
console.log('Loading AOI from KML file', file);
const aoi = new AOI(file);
const manifestFile = 'data/'+new Date().getTime()+'.csv';

// Instantiate script status tracker
const status = new Status(argv.jobId);

// Create mosaic instances from provided URLs
const mosaics = argv.mosaics.map((mosaic, i) => {
  return new Mosaic(argv.provider, 'image' + (i + 1), mosaic, status);
});

// Create and upload subjects
const manifest = new Manifest(mosaics, aoi, argv.project, argv.subjectSet, status);

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
