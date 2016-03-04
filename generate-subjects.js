'use strict';
const fs            = require('fs');
const async         = require('async');
const yargs         = require('yargs');
const csvStringify  = require('csv-stringify');
const AOI           = require('./modules/aoi');
const Mosaic        = require('./modules/mosaic');
const imgMeta       = require('./modules/image-meta');
const Manifest      = require('./modules/manifest');

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

// Create mosaic instances from provided URLs
const mosaics = argv.mosaics.map((mosaic, i) => {
  return new Mosaic('image' + i, mosaic);
});

// Fetch imagery
async.mapSeries(mosaics, (mosaic, callback) => {
  mosaic.createTilesForAOI(aoi, callback);
}, (err, filesByMosaic) => {
  if (err) throw err;
  // Generate manifest
  const manifest = new Manifest(filesByMosaic);
  manifest.generate((err, manifest) => {
    if (err) throw err;

    fs.writeFileSync(manifestFile, manifest);
    console.log('Finished writing manifest.');
  });
});





