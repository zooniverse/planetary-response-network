var jsdom       = require('jsdom').jsdom
var tj          = require('togeojson')
var fs          = require('fs')
var glob        = require('glob')
var path        = require('path')
var exec        = require('child_process').exec
var async       = require('async')
var planetAPI   = require('./modules/planet-api.js')
var geoCoords   = require('./modules/geo-coords.js')
var pxToGeo     = require('./modules/px-to-geo.js')
var tilizeImage = require('./modules/tilize-image.js')
var imgMeta     = require('./modules/image-meta.js')


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

// planetAPI.fetchBeforeAndAfterMosaicFromAOI( before_url, after_url, bounds )

// /* Same as above, but generate a manifest afterwards (still needs work) */
// planetAPI.fetchBeforeAndAfterMosaicFromAOI( before_url, after_url, bounds,
// // var moments = [ [ 'data/L15-1509E-1187N_before.tif' ],
// //             [ 'data/L15-1509E-1187N_after.tif'] ]
//   function (moments){
//     var task_list = []
//     for(var i=0; i<moments.length; i++){
//       regions = moments[i];
//       for(var j=0; j<regions.length; j++){
//         image_file = regions[j]
//         task_list.push( async.apply( tilizeImage, image_file, 480, 160 ) )
//       }
//     }
//     console.log('Tilizing images...');
//     async.series( task_list, function(error, result) {
//       console.log('Tilizing complete.');
//       // generateManifest()
//       uploadSubjects()
//       // callback(null, result)
//     })
//   }
// )

// generateManifest()
// uploadSubjects()

var bucket   = 'planetary-response-network'
var filename = 'data/L15-1509E-1187N_before_9_10.png'

var uploadToS3 = require('./modules/upload-to-s3.js')
uploadToS3(filename, filename, bucket, function(error, result){
  if(error){
    console.log(error);
  } else{
    console.log('File ' + result + ' uploaded to S3.');
  }

});

function generateManifest(){
  // create csv header
  var csv_header = [ 'image1', 'image2', 'upper_left_lon', 'upper_left_lat', 'upper_right_lon', 'upper_right_lat', 'bottom_right_lon', 'bottom_right_lat', 'bottom_left_lon', 'bottom_left_lat', 'center_lon', 'center_lat' ]

  /* Get "before" tiles */
  glob("data/*after*.png", function (er, files) {
    async.mapSeries(files, fileMetaToCsv, function (err, csv_rows) {
      csv_rows.splice(0, 0, csv_header);
      csvStringify(csv_rows, function(error, output){
        fs.writeFileSync('data/manifest.csv', output);
        console.log('Finished writing manifest.')
      });
    })
  })
}

// function uploadFileToS3(src, dest, bucket){
//   console.log('Uploading subjects...');
//
//   AWS.config.update({ // This assumes you have AWS credentials exported in ENV
//     accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY
//   })
//
//   var s3 = new AWS.S3();
//   var bucket   = bucket //'planetary-response-network'
//   var filename = src    //'data/L15-1509E-1187N_before_9_10.png'
//   var file_buffer = fs.readFileSync(filename);
//
//   s3.putObject({
//     ACL: 'public-read',
//     Bucket: bucket,
//     Key: dest,
//     Body: file_buffer,
//     ContentType: 'image/png' // Note: Otherwise file not served as image
//   }, function(error, response) {
//     console.log('Uploaded file: ', filename );
//   });
// }

// for debugging: edge of runway at Kathmandu airport
// console.log( pxToGeo( 2582,3406, size.x, size.y, reference_coordinates ) );

var fileMetaToCsv = function (filename, callback) {
  imgMeta.read(filename, function (err, metadata) {
    if (err) return callback(err)

    try {
      coords = JSON.parse( metadata["Exif.Photo.UserComment"] )
      // Note: might wanna check if "after" file exists
      callback(null, [ filename, filename.replace('after','before'), coords.upper_left.lon, coords.upper_left.lat, coords.upper_right.lon, coords.upper_right.lat, coords.bottom_right.lon, coords.bottom_right.lat, coords.bottom_left.lon, coords.bottom_left.lat, coords.center.lon, coords.center.lat ])
    } catch (e) {
      callback(e)
    }
  })
}
