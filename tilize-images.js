var fs           = require('fs')
var im           = require('imagemagick')
var jsonFormat   = require('json-format')
var util         = require('util')
var csvStringify = require('csv-stringify')
var async        = require('async')
var path         = require('path')
var yargs        = require('yargs')
var exiv2        = require('exiv2')
var pxToGeo      = require('./modules/px-to-geo')

var argv = yargs
    .usage('$0 [options] filename')
    .describe('tile-size', 'Pixel size for tiles')
    .describe('overlap', 'Pixel amount by which to overlap tiles')
    .default('tile-size', 480)
    .default('overlap', 160)
    .demand(1)
    .argv

var tile_wid = argv.tileSize;
var tile_hei = argv.tileSize;
var overlap  = argv.overlap;
var step_x = tile_wid - overlap;
var step_y = tile_hei - overlap;

var filename = argv._[0]
var basename = path.basename(filename).split('.')[0] // strip everything from filename (including extension)
var dirname  = path.dirname(filename)

var content = JSON.parse( fs.readFileSync( dirname + '/' + basename + '.json' ) )
var size = content.metadata.size
var reference_coordinates = content.metadata.reference_coordinates

// create csv header
var csv_content = []
csv_content.push( [ 'image_file', 'upper_left_lon', 'upper_left_lat', 'upper_right_lon', 'upper_right_lat', 'bottom_right_lon', 'bottom_right_lat', 'bottom_left_lon', 'bottom_left_lat', 'center_lon', 'center_lat' ] )

var task_list = []

for( var offset_x=0, row=0; offset_x<=size.x; offset_x+=step_x, row++) {
  for( var offset_y=0, col=0; offset_y<=size.y; offset_y+=step_y, col++) {

    // crop current tile
    var outfilename = dirname + '/' + basename + '_' + row + '_' + col + '.png'
    var crop_option = tile_wid + 'x' + tile_hei + '+' + offset_x + '+' + offset_y
    var extent_option = tile_wid + 'x' + tile_hei

    console.log('FOO: ', pxToGeo( offset_x, offset_y, size.x, size.y, reference_coordinates));

    task_list.push(
      async.apply(
        im.convert, [ filename + '[0]', '-crop', crop_option, '-background', 'black', '-extent', extent_option, '-gravity', 'center', '-compose', 'Copy', '+repage', outfilename ]
      )
    )


    /* Convert corner and center pixel coordinates to geo */
    coords = {foo: "bar"}
    //   upper_left   : pxToGeo( offset_x, offset_y, size.x, size.y, reference_coordinates)
    //   upper_right  : pxToGeo( offset_x + tile_wid, offset_y, size.x, size.y, reference_coordinates)
    //   bottom_right : pxToGeo( offset_x + tile_wid, offset_y + tile_hei, size.x, size.y, reference_coordinates)
    //   bottom_left  : pxToGeo( offset_x, offset_y + tile_hei, size.x, size.y, reference_coordinates)
    //   center       : pxToGeo( offset_x + tile_wid / 2, offset_y + tile_hei / 2, size.x, size.y, reference_coordinates) // NOT (lower_right.lat - upper_left.lat, lower_right.lon - upper_left.lon) because meridians and parallels
    /* Write coordinates to tile image metadata */
    writeImgMeta(outfilename, coords)
    readImgMeta(outfilename)

    // // for debugging
    // console.log('upper_left: ',   pxToGeo( offset_x,            offset_y,            size.x, size.y, reference_coordinates) )
    // console.log('upper_right: ',  pxToGeo( offset_x + tile_wid, offset_y,            size.x, size.y, reference_coordinates) )
    // console.log('bottom_right: ', pxToGeo( offset_x + tile_wid, offset_y + tile_hei, size.x, size.y, reference_coordinates) )
    // console.log('bottom_left: ',  pxToGeo( offset_x,            offset_y + tile_hei, size.x, size.y, reference_coordinates) )
    // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');

    // var subject_entry = [ outfilename, upper_left.lon, upper_left.lat, upper_right.lon, upper_right.lat, bottom_right.lon, bottom_right.lat, bottom_left.lon, bottom_left.lat, center.lon, center.lat ]
    // csv_content.push( subject_entry )

  }
}

// /* Run through task list */
async.series(task_list, function (error, result) {
    // result now equals 'done'
    if (error) {
      console.error(error);
    }
    csvStringify(csv_content, function(error, output){
      console.log('Tiles created.');
      // console.log('Tiles created; writing manifest...');
      // fs.writeFileSync('manifest.csv', output);
      // console.log('done.')
    });
});

// for debugging: edge of runway at Kathmandu airport
// console.log( pxToGeo( 2582,3406, size.x, size.y, reference_coordinates ) );


/* Methods to read/write JSON metadata using exiv2 */

function writeImgMeta( filename, data ){
  var metadata = { "Exif.Photo.UserComment": JSON.stringify(data) }

  exiv2.setImageTags(filename, data, function(error){
    if (error) {
      console.error(error);
    } else {
      console.log("setImageTags complete..");
    }
  });
}

function readImgMeta( filename ){
  exiv2.getImageTags(filename, function(error, tags) {
    if (error) {
      console.error(error);
    } else{
      try{
        return JSON.parse(tags["Exif.Photo.UserComment"])
      }
      catch(error){
        console.error('Invalid JSON: '+error);
      }
    }
  });
}
