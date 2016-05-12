'use strict';

const SentinelMGRSTile = require('./modules/sentinel-mgrs-tile');
const async = require('async');
const yargs = require('yargs');
const path  = require('path');

const argv = yargs
  .usage('$0 --paths path1 [path2...] --out output_path')
  .describe('paths', 'Path(s) to Sentinel-2 data (e.g. tiles/45/R/UL/2016/5/3/0/)')
  .describe('out',   'Output directory')
  .default('out',    './')
  .demand('paths')
  .array('paths')
  .argv;


let tiles = [];
argv.paths.map( (currentPath, i) => {
  tiles.push( new SentinelMGRSTile({path: path.normalize(currentPath) }).downloadImagesFromS3() );
});
