'use strict';
const yargs         = require('yargs');
const AOI           = require('./modules/aoi');
const Mosaic        = require('./modules/mosaic');
const Manifest      = require('./modules/manifest');

const Redis         = require('ioredis');
const redis         = new Redis();
const pub           = new Redis();

// status should be one of four values: null, 'in-progress', 'done', or 'error'
var tasks = {
    fetching_mosaics:    {status: null, label: 'Fetching mosaics'},
    tilizing_mosaics:    {status: null, label: 'Tilizing mosaic images'},
    generating_manifest: {status: null, label: 'Generating subject manifest'},
    uploading_images:    {status: null, label: 'Uploading images'},
    deploying_subjects:  {status: null, label: 'Deploying subjects'},
    finished:            {status: null, label: 'Build completed successfully'}
}

function updateStatus(task, status){
  console.log('[BUILD STATUS] Task \'%s\' status updated to \'%s\'', task, status);
  tasks[task].status = status
  pub.publish('build status', JSON.stringify(tasks));
}

// Go
const argv = yargs
  .usage('$0 [options] <kml_file>')
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

// Load AOI
const file = argv._[0];
console.log('Loading AOI from KML file', file);
const aoi = new AOI(file);
const manifestFile = 'data/'+new Date().getTime()+'.csv';

updateStatus('fetching_mosaics', 'in-progress'); // test only. updateStatus needs to be integrated into Mosaics class --STI

// Create mosaic instances from provided URLs
const mosaics = argv.mosaics.map((mosaic, i) => {
  return new Mosaic(argv.provider, 'image' + (i + 1), mosaic);
});

// Create and upload subjects
const manifest = new Manifest(mosaics, aoi, argv.project, argv.subjectSet);
manifest.deploy((err, result) => {
  if (err) throw err;
  console.log('Finished uploading subjects.');
});
