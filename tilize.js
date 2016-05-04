'use strict';
const yargs = require('yargs');
const tilize = require('./modules/tilize-image');

const argv = yargs
  .usage('$0 <options> image1 [image2...]')
  .option('size', {
    describe: 'Square size for tiles',
    default: 500
  })
  .option('overlap', {
    describe: 'Tile overlap (both x and y)',
    default: 250
  })
  .option('equalize', {
    describe: 'Equalize histogram to stretch contrast',
    boolean: true
  })
  .option('labels', {
    describe: 'Space-separated list of labels to overlay on tiles (first label will be used for tiles from first image, and so on)',
    array: true
  })
  .demand(1)
  .argv;

let options = {};
if (argv.labels) options.labels = argv.labels;
if (argv.equalize) options.equalize = argv.equalize;

function done (err, files) {
  if (err) throw err;
  console.log('Done, created tiles:')
  console.log(files.join('\n'));
}

if (argv._.length === 1) {
  tilize.tilize(argv._[0], argv.size, argv.overlap, options, done);
} else {
  tilize.tilizeMany(argv._, argv.size, argv.overlap, options, done);
}