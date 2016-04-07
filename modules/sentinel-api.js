const AWS    = require('aws-sdk');
// const utmObj = require('utm-latlng');
const mgrs   = require('mgrs');
const Client = require('node-rest-client').Client;

var auth = { user: process.env.SCIHUB_USER, password: process.env.SCIHUB_PASS };
var client = new Client(auth);

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

  // console.log('URL: ', url); // FOR DEBUG --STI

  var req = client.get(url, args, function(data, response) {
    generateDownloadList(data, callback);
  });
  req.on('error', function(err) {
    console.log('Uh-oh! %s', err.request.options);
  });

}

function fetchDataFromSinergise(bounds) {
  console.log('Fetching data from Sinergise...');

}

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

// process single tile entry
function getProductTitle(entry) {
  console.log('Processing entry: %s', entry.title);
  return entry.title
}

// convert from bounds to polygon
function boundsToPolygon(bounds) {
  // console.log('boundsToPolygon()');
  if(bounds.length < 0) {
    console.log('No points!');
    return null;
  }
  var points = [];
  var mgrsTiles = [];
  for(point of bounds) {
    points.push(`${point[0]} ${point[1]}`);
    getMgrsTile( [ point[0], point[1] ] );
    mgrsTiles.push(getMgrsTile(point).slice(0,5));
  }

  mgrsTiles = [ new Set(mgrsTiles) ];

  return 'POLYGON((' + points.join(', ') + '))';
}

function downloadFromList(list, callback) {
  for(productTitle of list) {
    downloadFromS3(productTitle)
  }
}

function downloadFromS3(title) {
  console.log('Locating file ', title);
  var s3 = new AWS.S3({
    region: 'eu-central-1',
    params: { Bucket: 'sentinel-s2-l1c' }
  });

  // title = 'S2A_OPER_PRD_MSIL1C_PDMC_20160307T105355_R101_V20160214T232809_20160214T232809'
  // console.log('BLAH: ', `zips/${title}`);
  // s3.listObjects( { EncodingType: 'url', Prefix: `zips/${title}.zip` }, function(err, data) {
  s3.listObjects( { EncodingType: 'url', Prefix: 'tiles/45/R/UL/', Delimiter: 'B02.jp2' }, function(err, data) {
    if (err) console.log(err, err.stack);
    else {
      console.log('DATA: ', data);
      process.exit(0);
    }
  });



  // s3.getObject({Key: title}, function(err, data) {
  //   if (err) console.log(err, err.stack); // an error occurred
  //   else     console.log(data);           // successful response
  // });

}

function getMgrsTile(point) {
  return mgrs.forward(point);
}
