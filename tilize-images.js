var fs           = require('fs')
var im           = require('imagemagick')
var jsonFormat   = require('json-format')
var util         = require('util')
var csvStringify = require('csv-stringify')
var async        = require('async')

var tile_wid = 480;
var tile_hei = 480;
// var overlap  = 160; // overlap by pixels

var filename = process.argv[2]
if (!filename) {
	console.error('Filename must be provided')
	process.exit(1)
}

var basename = filename.split('/').reverse()[0].split('.')[0] // strip everything from filename (including extension)

var content  = JSON.parse( fs.readFileSync( 'data/' + basename + '.json' ) )
var size = content.metadata.size
var reference_coordinates = content.metadata.reference_coordinates

// create csv header
var csv_content = []
csv_content.push( [ 'image_file', 'upper_left_lon', 'upper_left_lat', 'upper_right_lon', 'upper_right_lat', 'bottom_right_lon', 'bottom_right_lat', 'bottom_left_lon', 'bottom_left_lat' ] )

var task_list = []

for( var offset_x=0, row=0; offset_x<=size.x; offset_x+=tile_wid, row++) {
  for( var offset_y=0, col=0; offset_y<=size.y; offset_y+=tile_hei, col++) {

    // crop current tile
    var outfilename = 'data/' + basename + '_' + row + '_' + col + '.png'
    var crop_option = tile_wid + 'x' + tile_hei + '+' + offset_x + '+' + offset_y
    var extent_option = tile_wid + 'x' + tile_hei

    task_list.push(
      async.apply(
        im.convert, [ filename + '[0]', '-crop', crop_option, '-background', 'black', '-extent', extent_option, '-gravity', 'center', '-compose', 'Copy', outfilename ] 
      )
    )

    /* Convert corner and center pixel coordinates to geo */
    var upper_left   = pxToGeo( offset_x, offset_y, size.x, size.y, reference_coordinates)
    var upper_right  = pxToGeo( offset_x + tile_wid, offset_y, size.x, size.y, reference_coordinates)
    var bottom_right = pxToGeo( offset_x + tile_wid, offset_y + tile_hei, size.x, size.y, reference_coordinates)
    var bottom_left  = pxToGeo( offset_x, offset_y + tile_hei, size.x, size.y, reference_coordinates)

    // // for debugging
    // console.log('upper_left: ',   pxToGeo( offset_x,            offset_y,            size.x, size.y, reference_coordinates) )
    // console.log('upper_right: ',  pxToGeo( offset_x + tile_wid, offset_y,            size.x, size.y, reference_coordinates) )
    // console.log('bottom_right: ', pxToGeo( offset_x + tile_wid, offset_y + tile_hei, size.x, size.y, reference_coordinates) )
    // console.log('bottom_left: ',  pxToGeo( offset_x,            offset_y + tile_hei, size.x, size.y, reference_coordinates) )
    // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
//
    var subject_entry = [ outfilename, upper_left.lon, upper_left.lat, upper_right.lon, upper_right.lat, bottom_right.lon, bottom_right.lat, bottom_left.lon, bottom_left.lat ]
    csv_content.push( subject_entry )

  }
}

// /* Run through task list */
async.series(task_list, function (err, result) {
    // result now equals 'done'
    if (err) {
      console.error(err);
    }
    // console.log('All tasks completed successfully.');
});


csvStringify(csv_content, function(err, output){
  console.log(output);
});


// for debugging: edge of runway at Kathmandu airport
// console.log( pxToGeo( 2582,3406, size.x, size.y, reference_coordinates ) );

/* Convert corner and center pixels to geographical coordinates */
function pxToGeo( x, y, wid, hei, reference_coordinates ){
  delta_lon = Math.abs( reference_coordinates.upper_right.lon - reference_coordinates.upper_left.lon )
  delta_lat = Math.abs( reference_coordinates.upper_right.lat - reference_coordinates.bottom_right.lat )
  offset_lon = x * delta_lon / wid;
  offset_lat = y * delta_lat / hei;
  return {lon: reference_coordinates.upper_left.lon + offset_lon, lat: reference_coordinates.upper_right.lat - offset_lat}
  // return parseFloat(reference_coordinates.upper_right.lat - offset_lat) + ',' + parseFloat(reference_coordinates.upper_left.lon + offset_lon)
}
