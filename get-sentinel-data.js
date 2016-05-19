'use strict';

const SentinelMGRSTile = require('./modules/sentinel-mgrs-tile');
const async = require('async');
const yargs = require('yargs');
const path  = require('path');

const argv = yargs
  .usage('$0 --paths path1 [path2...]')
  .describe('paths', 'Path(s) to Sentinel-2 data (e.g. tiles/45/R/UL/2016/5/3/0/)')
  .demand('paths')
  .array('paths')
  .argv;


let tiles = [];
async.mapSeries(argv.paths, function(currentPath, callback){
  console.log('Fetching data from %s', currentPath);
  let newTile = new SentinelMGRSTile({path: path.normalize(currentPath) });
  tiles.push(newTile);
  async.series([
    newTile.downloadImagesFromS3.bind(newTile),
    newTile.createRGBComposite.bind(newTile)
  ], (err, result) => {
    if(err) throw err;
    callback(null); // move onto next image...
  });
});
