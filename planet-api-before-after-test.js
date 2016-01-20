var jsdom     = require('jsdom').jsdom
var tj        = require('togeojson')
var fs        = require('fs')
var glob      = require('glob')
var path      = require('path')
var exec      = require('child_process').exec
var async     = require('async')
var planetAPI = require('./modules/planet-api.js')
var geoCoords = require('./modules/geo-coords.js')

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


planetAPI.fetchBeforeAndAfterMosaicFromAOI( before_url, after_url, bounds )

// // test code
// var moments = [ [ 'data/L15-1509E-1187N_before.tif', 'data/L15-1509E-1188N_before.tif' ],
//             [ 'data/L15-1509E-1187N_after.tif', 'data/L15-1509E-1188N_after.tif' ] ]
// handleDownloadedImages(moments)
//
// function handleDownloadedImages(moments){
//   var task_list = []
//   for(var i=0; i<moments.length; i++){
//     regions = moments[i];
//     console.log('MOMENT: ', moments[i] );
//
//     for(var j=0; j<regions.length; j++){
//       image_file = regions[j]
//       console.log('REGION: ', regions[j] );
//
//       task_list.push( async.apply( tilizeImage, image_file ) )
//     }
//
//   }
//
//   console.log('Tilizing images...');
//   async.series( task_list, function(error, result) {
//     console.log('Finished tilizing images!');
//   })
//
// }

function tilizeImage(filename, callback){
  var basename = path.basename(filename).split('.')[0] // strip everything from filename (including extension)
  var dirname  = path.dirname(filename)
  var metadata = geoCoords.getMetadata(filename)

  var json_filename = dirname + '/' + basename + '.json'
  geoCoords.writeMetaToJSON( json_filename, metadata ) // write metadata for coordinate interpolations

  exec('node tilize-images.js '+filename, function(error, stdout, stderr){
    // console.log(`stdout: ${stdout}`);
    // console.log(`stderr: ${stderr}`);
    if (error !== null) {
      console.log(`exec error: ${error}`);
    }
    callback(null, filename)
  })

}

// /* Process each GeoTIF file that was dowloaded */
//
// glob("data/*.tif", function (er, files) {
//   for(var i=0; i<files.length; i++){
//     console.log('FILE = ', files[i]);
//
//   }
//   // files is an array of filenames.
//   // If the `nonull` option is set, and nothing
//   // was found, then files is ["**/*.js"]
//   // er is an error object or null.
// })
