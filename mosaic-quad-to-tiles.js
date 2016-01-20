path      = require('path')
yargs     = require('yargs')
geoCoords = require('./modules/geo-coords.js')
exec      = require('child_process').exec

var argv = yargs
  .usage('$0 [options] filename out_dir')
  // .describe('tile-size', 'Pixel size for tiles')
  // .describe('overlap', 'Pixel amount by which to overlap tiles')
  // .default('tile-size', 480)
  // .default('overlap', 160)
  .demand(2)
  .argv

var filename = argv._[0]
var out_dir  = argv._[1]

var basename = path.basename(filename).split('.')[0] // strip everything from filename (including extension)
var dirname  = path.dirname(filename)
var metadata = geoCoords.getMetadata(filename)

var json_filename = dirname + '/' + basename + '.json'
geoCoords.writeMetaToJSON( json_filename, metadata ) // write metadata for coordinate interpolations

exec('node tilize-images.js '+filename, function(error, stdout, stderr){
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);
  if (error !== null) {
    console.log(`exec error: ${error}`);
  }
})
