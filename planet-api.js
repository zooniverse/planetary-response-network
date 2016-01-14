var request    = require('request')
var http       = require('http')
var fs         = require('fs')
var jsonFormat = require('json-format')
var async      = require('async')

exports.fetchMosaicFromAOI = function ( bounds, url, key ){

  console.log('Fetching mosaics intersecting with AOI...');

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
          processFeatures(data.features) // download images and data
      }
  })
}

/* Figure out what to download from JSON response */
function processFeatures(features){
  var download_list = [] // array of function calls
  for(var i in features){
    var url = features[i].properties.links.full // note: different from scenes script
    var basename = url.split('/')[7]
    var dest = 'data/' + basename + '.tif'
    var meta_dest = 'data/' + basename + '.json'

    download_list.push( async.apply(downloadFile, url, dest ) ) // add to array of function calls
    // for debugging
    // download_list = [ async.apply(downloadFile, 'https://api.planet.com/v0/scenes/ortho/20151031_100858_0b09/full?product=visual', dest ) ]

    /* Write Metadata to JSON */
    fs.writeFile(meta_dest, jsonFormat(features[i]), function(err){
      if (err) console.error('Could not save feature data to JSON! ' + err)
    });

  }

  /* Download files from list */
  async.parallel(download_list, function (err, result) {
      // result now equals 'done'
      if (err) {
        console.error(err);
      }
      console.log('All downloads completed successfully.');
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
          callback(null)
        });
      }
  })
}
