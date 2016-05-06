'use strict';
const fs = require('fs');
const util = require('util');
const async = require('async');
const yargs = require('yargs');
const csvStringify = require('csv-stringify');
const imageMeta = require('./modules/image-meta');

const isChild = require.main !== module;

function cli (yargs) {
  let demand = isChild ? 2 : 1;

  return yargs
    .usage('$0 <options> image1 [image2...]')
    .example('generate-manifest *.jpeg --images-per-subject 2', 'Generate a manifest from all jpeg files in current directory, grouping images into pairs for the subjects. Use this when your tile filenames are prefixed by location (e.g. 0_0, 0_1, etc)')
    .example('generate-manifest *.jpeg --images-per-subject 2 --interleave', 'Generate a manifest from all jpeg files in current directory. Given 10 images, pairs will be as follows: 1 & 6, 2 & 7, 3 & 8, 4 & 9, 5 & 10. Use this when your tile filenames are prefixed with their source image\'s filename')
    .option('images-per-subject', {
      describe: 'How many images to add to each subject',
      number: true,
      default: 1
    })
    .option('interleave', {
      describe: 'Divide image list into equal sections, based on -images-per-subject, and assign each subject one image from each section',
      default: false,
      boolean: true
    })
    .option('use-geodata', {
      describe: 'Read tile coordinates from exif userdata and write them to the manifest. Note: for multi-image subjects, it will be assumed that each image covers the same geoegraphical area, so the coordinates from the first image in each subject will be used',
      default: false,
      boolean: true
    })
    .option('outfile', {
      describe: 'File to which CSV data should be written. Omit to use stdout'
    })
    .option('allow-missing', {
      describe: 'Don\'t quit for missing files',
      boolean: true,
      default: false
    })
    .demand(demand)
    .check(argv => {
      // Convenience named positional args array not initialised yet, handle it ourselves
      argv.images = isChild ? argv._.slice(1) : argv._;
      // Ensure number of images is divisible by images per subject
      if (argv.images.length % argv.imagesPerSubject !== 0) {
        throw new Error(util.format('Number of supplied images (%d) must be divisible by --images-per-subject (%d) with no remainder', argv.images.length, argv.imagesPerSubject));
      }
      return true;
    });
}

function run (argv) {
  // Check for missing images
  for (let image of argv.images) {
    if (!fs.existsSync(image) && !argv.allowMissing) {
      console.error('Image %s does not exist', image);
      process.exit(1);
    }
  }
  // Create image headings
  let csvHeader = [];
  for (let i = 0; i < argv.imagesPerSubject; i++) {
    csvHeader.push(`image${i+1}`);
  }
  // Create coordinate headings
  if (argv.useGeodata) {
    csvHeader = csvHeader.concat([
      'upper_left_lon',
      'upper_left_lat',
      'upper_right_lon',
      'upper_right_lat',
      'bottom_right_lon',
      'bottom_right_lat',
      'bottom_left_lon',
      'bottom_left_lat',
      'center_lon',
      'center_lat'
    ]);
  }
  // Group images into subjects
  let subjects = [];
  if (argv.interleave) {
    // Grab an image from each "section" of the tile list.
    // This is supposed to equate to grouping by source image,
    // which should work providing the source image filenames
    // are used to prefix the tile filenames in some way.
    let sections = [];
    let sectionSize = argv.images.length / argv.imagesPerSubject;
    for (let j = 0; j < sectionSize; j++) {
      let subject = [];
      for (let k = 0; k < argv.imagesPerSubject; k++) {
        subject.push(argv.images[j + (k * sectionSize)]);
      }
      subjects.push(subject);
    }
  } else {
    // No interleaving; just group images by pulling them from the
    // top of the list. This is useful for cases where tile names
    // are prefixed with location rather than source image name
    for (let j = 0; j < argv.images.length; j = j + argv.imagesPerSubject) {
      subjects.push(argv.images.slice(j, j + argv.imagesPerSubject));
    }
  }

  if (argv.useGeodata) {
    async.mapSeries(subjects, (subject, done) => {
      // Get geodata from first image (all tiles should be of same area)
      imageMeta.read(subject[0], ['-UserComment'], (err, meta) => {
        let coords = JSON.parse(decodeURIComponent(meta.userComment));
        subject = subject.concat([
          coords.upper_left.lon,
          coords.upper_left.lat,
          coords.upper_right.lon,
          coords.upper_right.lat,
          coords.bottom_right.lon,
          coords.bottom_right.lat,
          coords.bottom_left.lon,
          coords.bottom_left.lat,
          coords.center.lon,
          coords.center.lat
        ]);
        if (err) return done(err);
        done(null, subject);
      });
    }, (err, subjects) => {
      if (err) throw err;
      doCsv(csvHeader, subjects);
    });
  } else {
    doCsv(csvHeader, subjects);
  }

  function doCsv(header, rows) {
    // Build csv rows
    rows = [header].concat(rows);
    // Generate CSV string
    csvStringify(rows, function(err, csvString) {
      if (argv.outfile) {
        fs.writeFile(argv.outfile, csvString, (err) => {
          if (err) throw err;
          console.log('Wrote', argv.outfile);
        })
      } else {
        console.log(csvString);
      }
    });
  }

}

// Allow running directly...
if (!isChild) {
  run(cli(yargs).argv);
}
// ...and requiring in a yargs subcommand
exports.command = 'generate-manifest [images..]'
exports.describe = 'Create a CSV manifest from tile image(s)'
exports.builder = yargs => cli(yargs);
exports.handler = run;

