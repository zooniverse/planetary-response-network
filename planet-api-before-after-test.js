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


var uploadToS3  = require('./modules/upload-to-s3.js')
var panoptesAPI = require('./modules/create-panoptes-subject.js')
var parse       = require('csv-parse')

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

var manifest_file = 'data/manifest.csv'
var project_id     = '2035'
var subject_set_id = '3584'

/* Call Planet API and download GeoTIF and accompanying JSON files */
// planetAPI.fetchMosaicFromAOI( bounds, before_url, 'foo')

// planetAPI.fetchBeforeAndAfterMosaicFromAOI( before_url, after_url, bounds )

// /* Same as above, but generate a manifest afterwards (still needs work) */
// planetAPI.fetchBeforeAndAfterMosaicFromAOI( before_url, after_url, bounds,
// // var moments = [ [ 'data/L15-1509E-1187N_before.tif' ],
// //             [ 'data/L15-1509E-1187N_after.tif'] ]
//   function (error, result){
//     if(error){
//       console.log(error);;
//     } else{
//       var task_list = []
//       for(var i=0; i<result.length; i++){
//         regions = result[i];
//         for(var j=0; j<regions.length; j++){
//           image_file = regions[j]
//           task_list.push( async.apply( tilizeImage, image_file, 480, 160 ) )
//         }
//       }
//       console.log('Tilizing images...');
//       async.series( task_list, function(error, result) {
//         console.log('Tilizing complete.');
//
//         generateManifest( manifest_file, function(){
//           console.log('Finished generating manifest!');
//           uploadSubjects(manifest_file, project_id, subject_set_id, function(){
//             console.log('Finished uploading subjects!');
//           })
//         })
//         // uploadImages()
//         // callback(null, result)
//       })
//     }
//   }
// )

uploadImages(manifest_file, project_id, subject_set_id, function(){
  console.log('Finished uploading subjects!');
  // createSubjects()
})


// generateManifest()
// uploadSubjects()

// var createPanoptesSubject = require('./modules/create-panoptes-subject.js')
//
// // project info for planetary response network
// var project_id     = '2035'
// var subject_set_id = '3584'
//
// var subject = null
// createPanoptesSubject(subject, project_id, subject_set_id)
//
//

// var bucket   = 'planetary-response-network'
// var filename = 'data/L15-1509E-1187N_before_9_10.png'
//
// var uploadToS3 = require('./modules/upload-to-s3.js')
// uploadToS3(filename, filename, bucket, function(error, result){
//   if(error){
//     console.log(error);
//   } else{
//     console.log('File ' + result + ' uploaded to S3.');
//   }
// });

function uploadImages(manifest_file, project_id, subject_set_id, callback){
  console.log('Uploading images...');

  // Using the first line of the CSV data to discover the column names
  rs = fs.readFile(manifest_file, function(err,data){
    parse(data, {columns: true}, function(err,rows){

      async.mapSeries(rows, processRow, function(error, result){
        console.log('ROW PROCESSED ', result);
      })

      // for(var i=0; i<data.length; i++){
      //   var row = data[i]
      //   // var locations = [
      //   //   { 'image/png': row['image1'] },
      //   //   { 'image/png': row['image2'] }
      //   // ]
      //   // console.log('LOCATIONS = ', locations);
      // }

    })

    // console.log('DATA = ', data);
    // parse(data, {columns: true}, function(err,data){
    //   console.log('DATA (PARSED): ', data[0]['image1']);
    //   var filename = data[0]['image1']
    //   uploadToS3(filename, filename, 'planetary-response-network', function(error, result){
    //     if(error){
    //       console.log(error)
    //     } else{
    //       console.log(result);
    //     }
    //   })
    // })
  });

  function processRow(row, callback){

    // console.log('fooRows received this --> ', blah);
    // uploadToS3()
    async.series([
      async.apply( uploadToS3, row['image1'], row['image1'], 'planetary-response-network' ),
      async.apply( uploadToS3, row['image2'], row['image2'], 'planetary-response-network' )
    ], function(error, result){
      // console.log('Finished processing row! ');
      callback(null, row)
    })
  }

  // parse(rs, {columns: true}, function(err, data){
  //   console.log(data);
  // })
  // rs.pipe(foo);

  // basicCSV.readCSV( manifest_file, { dropHeader: false }, function(error, rows) {
  //  if(error){
  //    callback(error)
  //  }else{
  //    console.log('ROWS = ', rows);
  //    var header = rows[0]
  //    for(var i=1; i<rows.length; i++){
  //      var current_row = rows[i]
  //      console.log('ROSLDKJSHD; ', current_row['image1']);
  //      var locations = [
  //        { 'image/png': current_row[0] },
  //        { 'image/png': current_row[1] },
  //      ]

      //  uploadToS3(current_row[0])

      //  var metadata = {
      //     upper_left_lon:   current_row[2],
      //     upper_left_lat:   current_row[3],
      //     upper_right_lon:  current_row[4],
      //     upper_right_lat:  current_row[5],
      //     bottom_right_lon: current_row[6],
      //     bottom_right_lat: current_row[7],
      //     bottom_left_lon:  current_row[8],
      //     bottom_left_lat:  current_row[9],
      //     center_lon:       current_row[10],
      //     center_lat:       current_row[11]
      //   }
      //   var subject = {
      //     locations: locations,
      //     metadata: metadata,
      //     links:{
      //       project: project_id,
      //       subject_sets: [subject_set_id]
      //     }
      //   }
      //   console.log('SUBJECT = ', subject)
 //     }
 //   }
 // })

  // callback(null, result)


}

function generateManifest(manifest_file, callback){
  // create csv header
  var csv_header = [ 'image1', 'image2', 'upper_left_lon', 'upper_left_lat', 'upper_right_lon', 'upper_right_lat', 'bottom_right_lon', 'bottom_right_lat', 'bottom_left_lon', 'bottom_left_lat', 'center_lon', 'center_lat' ]

  /* Get "before" tiles */


  glob("data/*after*.png", function (error, files) {
    async.mapSeries(files, fileMetaToCsv, function (error, csv_rows) {
      csv_rows.splice(0, 0, csv_header);
      csvStringify(csv_rows, function(error, output){
        fs.writeFile(manifest_file, output, function(){
          console.log('Finished writing manifest.')
          callback(null, manifest_file)
        });
      });
    })
  })
}

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
