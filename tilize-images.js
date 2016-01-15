var fs         = require('fs')
var im         = require('imagemagick')
var jsonFormat = require('json-format')
var util       = require('util')

var tile_wid = 640;
var tile_hei = 640;
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

for( var offset_x=0, row=0; offset_x<=size.x; offset_x+=tile_wid, row++) {
  for( var offset_y=0, col=0; offset_y<=size.y; offset_y+=tile_hei, col++) {

    // crop current tile
    var outfilename = 'data/' + basename + '_' + row + '_' + col + '.png'
    var crop_option = tile_wid + 'x' + tile_hei + '+' + offset_x + '+' + offset_y
    im.convert( [ filename + '[0]', '-crop', crop_option, outfilename ],
    function (err, stdout) {
      if (err) throw err;
      // console.log('Cropping complete.');
    });

    // // for debugging
    // console.log('    (ROW,COL) = ', row, ',', col );

    // convert corner and center pixel coordinates to geo
    console.log('upper_left: ',   pxToGeo( offset_x,            offset_y,            size.x, size.y, reference_coordinates) )
    console.log('upper_right: ',  pxToGeo( offset_x + tile_wid, offset_y,            size.x, size.y, reference_coordinates) )
    console.log('bottom_right: ', pxToGeo( offset_x + tile_wid, offset_y + tile_hei, size.x, size.y, reference_coordinates) )
    console.log('bottom_left: ',  pxToGeo( offset_x,            offset_y + tile_hei, size.x, size.y, reference_coordinates) )
    console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
  }
}

// for debugging: edge of runway at Kathmandu airport
// console.log( pxToGeo( 2582,3406, size.x, size.y, reference_coordinates ) );

/* Convert corner and center pixels to geographical coordinates */
function pxToGeo( x, y, wid, hei, reference_coordinates ){
  delta_lon = Math.abs( reference_coordinates.upper_right.lon - reference_coordinates.upper_left.lon )
  delta_lat = Math.abs( reference_coordinates.upper_right.lat - reference_coordinates.bottom_right.lat )
  offset_lon = x * delta_lon / wid;
  offset_lat = y * delta_lat / hei;
  // return {lon: reference_coordinates.upper_left.lon + offset_lon, lat: reference_coordinates.upper_right.lat - offset_lat}
  return parseFloat(reference_coordinates.upper_right.lat - offset_lat) + ',' + parseFloat(reference_coordinates.upper_left.lon + offset_lon)
}
