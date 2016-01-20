var request    = require('request')
var http       = require('http')
var fs         = require('fs')
var jsonFormat = require('json-format')
var async      = require('async')

function fetchBeforeAndAfterMosaicFromAOI ( before_url, after_url, bounds, key){
  console.log('Fetching before/after mosaics intersecting with AOI...')
  fetchMosaicFromAOI(bounds, before_url, 'before', key)
  fetchMosaicFromAOI(bounds, after_url, 'after', key)
}

/* Downloads a GeoTIF mosaic quad */
function fetchMosaicFromAOI ( bounds, url, label, key ){

  console.log('Fetching ' + label + ' mosaics intersecting with AOI...');

  var intersects = JSON.stringify({
      "type": "Polygon",
        "coordinates": [bounds]
  })

  var params = { intersects: intersects }
  auth = "Basic " + new Buffer(key + ":").toString("base64") // note: scoped to entire module

  // send request to api
  request({
      url: url,
      qs: params,
      method: "GET",
      headers: {
          "Authorization": auth
      },
  }, function (error, response, body) {
      if (!error) {
          var data = JSON.parse(body)

          //

          // /* List quad ids */
          // for(var i in data.features){
          //   console.log(data.features[i].id);
          // }

          processFeatures(data.features, label, function(result){ console.log('DOWNLOAD LIST: ', result ); } ) // download images and data
      }
  })
}

/* Figure out what to download from JSON response */
function processFeatures(features, label, callback){
  var task_list = [] // array of function calls
  for(var i in features){
    var url = features[i].properties.links.full // note: different from scenes script
    var basename  = url.split('/')[7]
    var dest      = 'data/' + basename + '_' + label + '.tif'
    var meta_dest = 'data/' + basename + '_' + label + '.json'

    // prepare array of function calls
    task_list.push(
      function(cb){
        downloadFile(url, dest, function() {
          cb(null, dest)
        })
      } // note: equivalent to async.apply( downloadFile, url, dest ) // equivalent

    )

    /* Write Metadata to JSON */
    fs.writeFile(meta_dest, jsonFormat(features[i]), function(err){
      if (err) console.error('Could not save feature data to JSON! ' + err)
    });

  }

  /* Download files from list */
  async.parallel(task_list, function (err, result) {
    if (err) console.error(err);
    console.log('All downloads completed successfully: ', result);
    callback(result)
  });

}

/* Downloads a file at url to dest */
function downloadFile(url, dest, callback){
  var localStream = fs.createWriteStream(dest)
  var out = request({
      url: url,
      method: "GET",
      headers: { "Authorization": auth }
  });

  out.on('response', function (resp) {
      if (resp.statusCode === 200){
        out.pipe(localStream);
        localStream.on('close', function () {
          console.log('  File ' + dest + ' transfer complete.')
          callback(null,dest) // return path to downloaded file
        });
      }
  })
}

/* Handle module exports */
exports.downloadFile                     = downloadFile
exports.fetchMosaicFromAOI               = fetchMosaicFromAOI
exports.fetchBeforeAndAfterMosaicFromAOI = fetchBeforeAndAfterMosaicFromAOI
