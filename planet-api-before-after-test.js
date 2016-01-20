var jsdom     = require('jsdom').jsdom
var tj        = require('togeojson')
var fs        = require('fs')
var glob      = require('glob')
var path      = require('path')
var exec      = require('child_process').exec
var async     = require('async')
var planetAPI = require('./modules/planet-api.js')
var geoCoords = require('./modules/geo-coords.js')


var im           = require('imagemagick')
var jsonFormat   = require('json-format')
var util         = require('util')
var csvStringify = require('csv-stringify')
var path         = require('path')
var exiv2        = require('exiv2')

// var url = "https://api.planet.com/v0/scenes/ortho/"
// var url = "https://api.planet.com/v0/mosaics/nepal_landsat_prequake_mosaic/quads/"
// var url = "https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/"
// var url = "https://api.planet.com/v0/mosaics/nepal_3mo_pre_eq_mag_6_mosaic/quads/"
// var url = "https://api.planet.com/v0/mosaics/nepal_interquake_mosaic/quads/"

var before_url = 'https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/'
var after_url  = 'https://api.planet.com/v0/mosaics/nepal_3mo_pre_eq_mag_6_mosaic/quads/'

var kml = jsdom(fs.readFileSync('data/central-kathmandu.kml'));
var geoJSON = tj.kml(kml)
var bounds = geoJSON.features[0].geometry.coordinates[0]

/* Call Planet API and download GeoTIF and accompanying JSON files */
// planetAPI.fetchMosaicFromAOI( bounds, before_url, 'foo')


planetAPI.fetchBeforeAndAfterMosaicFromAOI( before_url, after_url, bounds,
// var moments = [ [ 'data/L15-1509E-1187N_before.tif' ],
//             [ 'data/L15-1509E-1187N_after.tif'] ]
  function (moments){

    var task_list = []
    for(var i=0; i<moments.length; i++){
      regions = moments[i];
      // console.log('MOMENT: ', moments[i] );
      for(var j=0; j<regions.length; j++){
        image_file = regions[j]
        // console.log('REGION: ', regions[j] );
        task_list.push( async.apply( tilizeImage, image_file, null, null ) )
      }
    }

    console.log('Tilizing images...');
    async.series( task_list, function(error, result) {
      console.log('Finished tilizing images.');
      // callback(null, result)
    })
  }
)

function tilizeImage(filename, tileSize, overlap, callback){
  tileSize = 2048
  overlap = 0
  var tile_wid = tileSize;
  var tile_hei = tileSize;
  var step_x = tile_wid - overlap;
  var step_y = tile_hei - overlap;

  var basename = path.basename(filename).split('.')[0]
  var dirname  = path.dirname(filename)
  var metadata = geoCoords.getMetadata(filename)

  var json_filename = dirname + '/' + basename + '.json'
  geoCoords.writeMetaToJSON( json_filename, metadata ) // write metadata for coordinate interpolations

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

      /* Convert corner and center pixel coordinates to geo */
      var coords = {
        upper_left   : pxToGeo( offset_x,                offset_y,                size.x, size.y, reference_coordinates),
        upper_right  : pxToGeo( offset_x + tile_wid,     offset_y,                size.x, size.y, reference_coordinates),
        bottom_right : pxToGeo( offset_x + tile_wid,     offset_y + tile_hei,     size.x, size.y, reference_coordinates),
        bottom_left  : pxToGeo( offset_x,                offset_y + tile_hei,     size.x, size.y, reference_coordinates),
        center       : pxToGeo( offset_x + tile_wid / 2, offset_y + tile_hei / 2, size.x, size.y, reference_coordinates) // NOT (lower_right.lat - upper_left.lat, lower_right.lon - upper_left.lon) because meridians and parallels
      }

      /* Build up list of tasks */
      task_list.push(
        async.apply( im.convert, [ filename + '[0]', '-crop', crop_option, '-background', 'black', '-extent', extent_option, '-gravity', 'center', '-compose', 'Copy', '+repage', outfilename ] ),
        async.apply( writeImgMeta, outfilename, coords )  // write coordinates to tile image metadata
      )
    }
  }

  /* Run through task list */
  async.series(task_list, function (error, result) {
      // result now equals 'done'
      console.log('Tiles created.');
      callback(null, result)
      if (error) {
        console.error(error);
      }
      // else{
      //   csvStringify(csv_content, function(error, output){
      //     console.log('Tiles created.');
      //   });
      //   // callback(null, result)
      // }
  });

} // end tilizeImage()


// for debugging: edge of runway at Kathmandu airport
// console.log( pxToGeo( 2582,3406, size.x, size.y, reference_coordinates ) );

/* Convert corner and center pixels to geographical coordinates */
function pxToGeo( x, y, wid, hei, reference_coordinates ){
  delta_lon = Math.abs( reference_coordinates.upper_right.lon - reference_coordinates.upper_left.lon )
  delta_lat = Math.abs( reference_coordinates.upper_right.lat - reference_coordinates.bottom_right.lat )
  offset_lon = x * delta_lon / wid;
  offset_lat = y * delta_lat / hei;
  return {lon: reference_coordinates.upper_left.lon + offset_lon, lat: reference_coordinates.upper_right.lat - offset_lat}
}


/* Methods to read/write JSON metadata using exiv2 */

function writeImgMeta( filename, data, callback ){
  var data = { "Exif.Photo.UserComment": JSON.stringify(data) }

  exiv2.setImageTags(filename, data, function(error){
    if (error) {
      console.error(error);
    } else {
      console.log('  ' + filename + ': Saved reference coordinates to tile metadata.');
      readImgMeta(filename)
      callback(null, data)
    }
  });
}

function readImgMeta( filename ){
  exiv2.getImageTags(filename, function(error, tags) {
    if (error) {
      console.error(error);
    } else{
      try{
        console.log('TAGS: ', tags["Exif.Photo.UserComment"]);
        return JSON.parse(tags["Exif.Photo.UserComment"])
      }
      catch(error){
        console.error('Invalid JSON: '+error);
      }
    }
  });
}
