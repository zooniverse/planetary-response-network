'use strict';
// const utmObj = require('utm-latlng');
const mgrs        = require('mgrs');
const Client      = require('node-rest-client').Client;
const AWS         = require('aws-sdk');
const fs          = require('fs');
const async       = require('async');
const im          = require('imagemagick');
const tilizeImage = require('./tilize-image');

// AWS Parameters
const bucket = 'sentinel-s2-l1c';
const region = 'eu-central-1';
const s3 = new AWS.S3({region: region});

const auth = { user: process.env.SCIHUB_USER, password: process.env.SCIHUB_PASS };
const client = new Client(auth);

exports.fetchDataFromCopernicus = fetchDataFromCopernicus;
exports.fetchDataFromSinergise  = fetchDataFromSinergise;

function fetchDataFromCopernicus(params, callback) {
  console.log('Fetching data from Copernicus...');

  var cloudCoverPercentage = params.cloudcoverpercentage || `[0 TO 100]`;
  var beginPosition        = params.beginPosition || `[NOW-12MONTHS TO NOW]`;
  var endPosition          = params.endPosition || `[NOW-12MONTHS TO NOW]`;
  var platformName         = params.platformname || 'Sentinel-2';
  var format               = params.format || 'json';
  var polygon              = boundsToPolygon(params.bounds);
  // var polygon              = 'POLYGON((85.31790371515265 27.74112247549664, 85.29471858829717 27.72571509606928, 85.29413862454905 27.6938172811564, 85.31838875561394 27.67944111681705, 85.34663714286582 27.67782735898242, 85.36838931902295 27.68205287088499, 85.37743011085362 27.70303837353786, 85.37132696978759 27.72918006286135, 85.3473677598608 27.74063311882999, 85.31790371515265 27.74112247549664))'

  /* Build Query URI */
  var baseUrl = 'https://scihub.copernicus.eu/dhus/search'
  var query = `beginPosition:${beginPosition} AND \
    endPosition:${endPosition} AND \
    platformname:\"${platformName}\" AND \
    cloudcoverpercentage:${cloudCoverPercentage} AND \
    footprint:\"Intersects(${polygon})\"`
  .replace(/ +(?= )/g, ''); // remove multiple consecutive spaces

  var url = `${baseUrl}?format=${format}&q=${query}`;
  var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json'};
  var args = { headers: headers };

  console.log('URL: ', url); // FOR DEBUG

  var req = client.get(url, args, function(data, response) {
    generateDownloadList(data, callback);
  });
  req.on('error', function(err) {
    console.log('Uh-oh! %s', err.request.options);
  });

}

function fetchDataFromSinergise(bounds, callback) {
  console.log('Fetching data from Sinergise...');
  let mgrsTiles = boundsToMgrsTiles(bounds);
  // console.log('mgrsTiles = ', mgrsTiles); // DEBUG

  for(let mgrsPosition of mgrsTiles) {
    downloadTileImagesFromPosition(mgrsPosition, function(err, tileImages){
      createRGBComposite(function(err, result) {
        if(err) { callback(err); }
        callback(null, result)
      });
    });
  }

  // callback
}

function downloadTileImagesFromPosition(mgrsPosition, callback) {
  // console.log('downloadTileImagesFromPosition()'); // DEBUG
  let mgrs = splitMgrsPosition(mgrsPosition);

  getTileInfoKeysAtPosition(mgrs, function(err, tileInfoKeys) {
    console.log('Matched \'tileInfo.json\' files:\n', tileInfoKeys.map(function(data){
      return data.Prefix;
    }));
    console.log('Using %s (hard-coded selection)', tileInfoKeys[tileInfoKeys.length-3].Prefix);
    // Note: Currently hard-coded to get the third-latest image (for cloud-cover reasons)
    let latestTileInfoKey = tileInfoKeys.sort()[tileInfoKeys.length-3].Prefix; // get latest images only
    downloadFromS3(bucket, latestTileInfoKey, function(err, resp) {
      if (err) console.log(err);
      let path = JSON.parse(resp.httpResponse.body).path; // get path to image files
      downloadImagesFromS3(bucket, path, function(err, result) {
        if (err) { callback(err); }
        callback(null);
      });
    });
  });
}

function getTileInfoKeysAtPosition(mgrs, callback) {
  // console.log('getTileInfoKeysAtPosition()'); // DEBUG
  // Get list of available tileInfo.json files
  let params = {
    Bucket: bucket,
    EncodingType: 'url',
    Prefix: `tiles/${mgrs.gridZone}/${mgrs.latBand}/${mgrs.squareId}/`,
    Delimiter: 'tileInfo.json'
  }
  s3.listObjects( params, function(err, data) {
    if (err) callback(err);
    callback(null, data.CommonPrefixes);
  });
}

// Take bounds and return a list of Mgrs tiles
function boundsToMgrsTiles(bounds) {
  // console.log('boundsToMgrsTiles()'); // DEBUG
  if(bounds.length < 0) {
    console.log('No points!');
    return null;
  }
  var mgrsTiles = new Array();
  for(let point of bounds) {
    let gridSquareId = mgrs.forward( [ point[0], point[1] ] ); // convert from lat/lng to grid square ID
    mgrsTiles.push(gridSquareId.slice(0,5));
  }
  return Array.from( new Set(mgrsTiles) ); // remove any duplicates
}

// Note: Grid zones are designated by the UTM zone number, e.g. 45,
// intersected by the latitude band letter, e.g R
function splitMgrsPosition(mgrsPosition) {
  // split MGRS position, e.g. '45RUL' into constituent parts
  let str = mgrsPosition.match(/[a-z]+|\d+/ig)
  let gridZone = str[0];            // 45
  let latBand  = str[1].slice(0,1); // R
  let squareId = str[1].slice(1);   // UL
  return {gridZone, latBand, squareId}
}

function downloadImagesFromS3(bucket, path, callback) {
  // console.log('downloadImagesFromS3()', bucket, path); // DEBUG
  let fileList = [
    `${path}/B02.jp2`, // blue
    `${path}/B03.jp2`, // green
    `${path}/B04.jp2`, // red
  ];

  async.map(fileList, downloadFromS3.bind(null, bucket), function(err, result) {
    if (err) { console.log(err); }
    console.log('Finished downloading images.');
    callback(null, result)
  })
}

function downloadFromS3(bucket, key, callback) {
  // console.log('downloadFromS3()', bucket, key); // DEBUG
  let filename = key.replace(/\//g,'-');
  // let file = fs.createWriteStream(`./data/${filename}`);
  var file = require('fs').createWriteStream(`./data/${filename}`);
  let req = s3.getObject({ Bucket: bucket, Key: key}); //.createReadStream().pipe(file);
  req.on('httpData', function(chunk) { file.write(chunk); });
  req.on('httpDone', function(resp) {
    // console.log('resp: ', JSON.parse(resp.httpResponse.body) );
    file.end();
    console.log('Finished downloading %s', resp.request.params.Key);
    callback(null, resp)
  }).send();
}

function createRGBComposite(callback) {
  // console.log('createRGBComposite()'); // DEBUG
  fs.readdir('./data/', function(err,files) {
      let r, g, b = '';
      for(let file of files) {
        // console.log('FILE: ', file);
        if(file.match(/B02.jp2$/i)) { b = './data/' + file; }
        if(file.match(/B03.jp2$/i)) { g = './data/' + file; }
        if(file.match(/B04.jp2$/i)) { r = './data/' + file; }
      }
      if(r == '' || g == '' || b == '') {
        console.log('Error: Couldn\'nt generate composite image. Missing at least one color channel.');
      } else {
        console.log('Creating composite image...');
        let outfilename = 'data/composite.jpg';
        im.convert([ r, g, b, '-combine', '-normalize', 'data/composite.jpg' ] , function(err, strout) {
          if (err) console.log(err);
          callback(null, outfilename);
        });
      }

  });
}

/* COPERNICUS-SPECIFIC METHODS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> */

function generateDownloadList(data, callback) {
  var downloadList = [];
  var totalEntries = data.feed['opensearch:totalResults'];
  console.log('Number of entries found: %d', totalEntries);
  if( totalEntries == 1 ) { // API returns single entry object
    downloadList.push( getProductTitle(data.feed.entry) );
  } else if ( totalEntries > 1 ) { // API returns array of entries
    for(entry of data.feed.entry) {
      downloadList.push( getProductTitle(entry) );
    }
  }
  // callback(downloadList);
  downloadFromList(downloadList, callback);
}

function downloadFromList(list, callback) {
  for(let productTitle of list) {
    console.log('I should download: %s', productTitle);
    callback(null);
    // downloadFromS3(productTitle)

    // // Get list of available JP2s
    // let params = {
    //   Bucket: bucket,
    //   EncodingType: 'url',
    //   Prefix: `products/`,
    //   Delimiter: ''
    // }
    // s3.listObjects( params, function(err, data) {
    //   console.log('DATA: ', data);
    //   if (err) callback(err);
    //   callback(null, data.CommonPrefixes);
    // });

  }
}

// convert from bounds to polygon
function boundsToPolygon(bounds) {
  console.log('boundsToPolygon()');
  if(bounds.length < 0) {
    console.log('No points!');
    return null;
  }
  var points = [];
  for(var point of bounds) {
    points.push(`${point[0]} ${point[1]}`);
  }
  return 'POLYGON((' + points.join(', ') + '))';
}

// process single tile entry
function getProductTitle(entry) {
  console.log('Processing entry: %s', entry.title);
  return entry.title
}
