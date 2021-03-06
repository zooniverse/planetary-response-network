var jsdom        = require('jsdom').jsdom
var tj           = require('togeojson')
var fs           = require('fs')
var glob         = require('glob')
var async        = require('async')
var planetAPI    = require('./modules/planet-api.js')
var tilizeImage  = require('./modules/tilize-image.js')
var imgMeta      = require('./modules/image-meta.js')
var csvStringify = require('csv-stringify')
var uploadToS3   = require('./modules/upload-to-s3.js')
var panoptesAPI  = require('./modules/panoptes-api.js')
var parseCsv     = require('csv-parse')

/* Available mosaics:
 *   https://api.planet.com/v0/scenes/ortho/
 *   https://api.planet.com/v0/mosaics/nepal_landsat_prequake_mosaic/quads/
 *   https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/
 *   https://api.planet.com/v0/mosaics/nepal_3mo_pre_eq_mag_6_mosaic/quads/
 *   https://api.planet.com/v0/mosaics/nepal_interquake_mosaic/quads/
 */

 /* Selected mosaic */
var before_url = 'https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/'
var after_url  = 'https://api.planet.com/v0/mosaics/nepal_3mo_pre_eq_mag_6_mosaic/quads/'

/* Read area of interest */
var kml_file = process.argv[2] || 'data/central-kathmandu.kml'

console.log('Opening file ', kml_file);

var kml = jsdom(fs.readFileSync(kml_file))
var geoJSON = tj.kml(kml)
var bounds = geoJSON.features[0].geometry.coordinates[0]

/* Set parameters */
var manifest_file = 'data/manifest.csv'
var project_id     = '2035'
var subject_set_id = '3729' //'3617'
var bucket = 'planetary-response-network'

console.log('Fetching Mosaics...');

/* Call Planet API and download GeoTIF and accompanying JSON files */
planetAPI.fetchBeforeAndAfterMosaicFromAOI( before_url, after_url, bounds,
  // process downloaded mosaics
  function (error, result){
    if(error){
      console.log(error);;
    } else{
      var task_list = []
      for(var i=0; i<result.length; i++){
        regions = result[i];
        for(var j=0; j<regions.length; j++){
          image_file = regions[j]
          task_list.push( async.apply( tilizeImage.tilize, image_file, 480, 160 ) )
        }
      }
      console.log('Tilizing images...');
      var start_time = Date.now()

      async.series( task_list, function(error, result) {
        var elapsed_time = parseFloat( (Date.now()-start_time) / 60 / 1000).toFixed(2)
        console.log('Tilizing complete (' + elapsed_time + ' minutes)');
        console.log('Generating manifest file...');
        generateManifest( manifest_file, function(){
          deployPanoptesSubjects(manifest_file, project_id, subject_set_id, function(){
            // console.log('Finished uploading subjects.');
          })
        })
      })
    }
  }
)

function deployPanoptesSubjects(manifest_file, project_id, subject_set_id, callback){
  console.log('Uploading images...');

  // maybe clean up using async.waterfall?
  fs.readFile(manifest_file, function(error,data){
    parseCsv(data, {columns: true}, function(error,rows){
      uploadImages(rows, function(error,rows){
        generateSubjects(rows, function(error,subjects){
          panoptesAPI.saveSubjects(subjects, function(error,result){
            if(error){
              callback(error)
            } else{
              callback(null, result)
            }
          })
        })
      })
    })
  })

}

function uploadImages(rows, callback){
  async.mapSeries(rows, uploadSubjectImagesToS3, function(error,rows){
    if(error){
      callback(error)
    } else{
      callback(null,rows)
    }
  })
}

function generateSubjects(rows, callback){
  async.mapSeries(rows, createSubjectFromManifestRow, function(error,subjects){
    if(error){
      callback(error)
    } else{
      callback(null,subjects)
    }
  })
}

// Note: assumes there are two valid images in each row
function uploadSubjectImagesToS3(row, callback){
  async.series([
    async.apply( uploadToS3, row['image1'], row['image1'], bucket ),
    async.apply( uploadToS3, row['image2'], row['image2'], bucket )
  ], function(error, result){
    // replace local filename with image url
    row['image1'] = result[0]
    row['image2'] = result[1]
    callback(null, row)
  })
}

function createSubjectFromManifestRow(row, callback){
  var metadata = row
  var locations = [
    { 'image/jpeg': row['image1'] },
    { 'image/jpeg': row['image2'] }
  ]
  var subject = {
    locations: locations,
    metadata: metadata,
    links:{
      project: project_id,
      subject_sets: [subject_set_id]
    }
  }
  callback(null, subject)
}

function generateManifest(manifest_file, callback){
  // create csv header
  var csv_header = [ 'image1', 'image2', 'upper_left_lon', 'upper_left_lat', 'upper_right_lon', 'upper_right_lat', 'bottom_right_lon', 'bottom_right_lat', 'bottom_left_lon', 'bottom_left_lat', 'center_lon', 'center_lat' ]

  /* Get "before" tiles */
  glob("data/*after*.jpeg", function (error, files) {
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

var fileMetaToCsv = function (filename, callback) {
  imgMeta.read(filename, ['-userComment'], function (err, metadata) {
    if (err) return callback(err)

    try {
      coords = JSON.parse( decodeURIComponent(metadata["userComment"]) ) //JSON.parse( metadata["Exif.Photo.UserComment"] )
      // Note: might wanna check if "after" file exists
      callback(null, [ filename, filename.replace('after','before'), coords.upper_left.lon, coords.upper_left.lat, coords.upper_right.lon, coords.upper_right.lat, coords.bottom_right.lon, coords.bottom_right.lat, coords.bottom_left.lon, coords.bottom_left.lat, coords.center.lon, coords.center.lat ])
    } catch (e) {
      callback(e)
    }
  })
}
