'use strict';
const async = require('async');
const yargs = require('yargs');
const tilize = require('./modules/tilize-image');
const isChild = require.main !== module;

function cli (yargs) {
  let demand = isChild ? 2 : 1;

  return yargs
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
    .demand(demand)
    .check(argv => {
      // Convenience named positional args array not initialised yet, handle it ourselves
      argv.images = isChild ? argv._.slice(1) : argv._;
      // Ensure number of images and labels match if using labels
      if (argv.labels && argv.labels.length != argv.images.length) {
        throw new Error('If supplying labels, the number of labels must match the number of input images');
      }
      return true;
    });
}

function run (argv) {
  let options = {};
  if (argv.equalize) options.equalize = argv.equalize;

  // One image or multiple?
  let single = argv.images.length === 1;

  function done (err, files) {
    if (err) throw err;
    console.log('Done, created tiles:')
    console.log(single ? files.join('\n') : files.map(files => files.join('\n')).join('\n'));
  }

  if (single) {
    // Assign correct label
    if (argv.labels) options.label = argv.labels[0];
    // Tile!
    tilize.tilize(argv.images[0], argv.size, argv.overlap, options, done);
  } else {
    if (argv.labels) options.labels = argv.labels;
    // Process each image in turn
    async.mapSeries(argv.images, (image, done) => {
      // Assign correct label
      let idx = argv.images.indexOf(image);
      let imageOptions = options;
      imageOptions.label = options.labels[idx];
      // Tile!
      tilize.tilize(image, argv.size, argv.overlap, imageOptions, done);
    }, done);
  }
}

// Allow running directly...
if (!isChild) {
  run(cli(yargs).argv);
}
// ...and requiring in a yargs subcommand
exports.command = 'tilize [images..]'
exports.describe = 'Tilize GeoTIFF image(s)'
exports.builder = yargs => cli(yargs);
exports.handler = run;

