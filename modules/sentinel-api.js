'use strict';
const mgrs        = require('mgrs');
const Client      = require('node-rest-client').Client;
const AWS         = require('aws-sdk');
const fs          = require('fs');
const async       = require('async');
const im          = require('imagemagick');
const tilizeImage = require('./tilize-image');
const utmObj      = require('utm-latlng');
const mkdirp      = require('mkdirp');
const path        = require('path');
const imgMeta     = require('./image-meta');
const gdalUtils   = require('./gdal-utils');

var utm = new utmObj();

// AWS Parameters
const bucket = 'sentinel-s2-l1c';
const region = 'eu-central-1';
const s3 = new AWS.S3({region: region});

function downloadFromS3(bucket, key, dest, callback) {
  console.log('downloadFromS3() {bucket: %s, key: %s, dest: %s}', bucket, key, dest); // DEBUG

  mkdirp(path.dirname(dest), function(err) { // ensure dest dir exists
    if(err) throw err;
    var file = require('fs').createWriteStream(dest);
    let req = s3.getObject({ Bucket: bucket, Key: key}); //.createReadStream().pipe(file);
    req.on('httpData', function(chunk) { file.write(chunk); });
    req.on('httpDone', function(resp) {
      // console.log('resp: ', JSON.parse(resp.httpResponse.body) );
      file.end();
      console.log('Finished downloading %s', resp.request.params.Key);
      callback(null, resp);
    }).send();
  });
}

const auth = { user: process.env.SCIHUB_USER, password: process.env.SCIHUB_PASS };
const client = new Client(auth);

/////////////////////////////// GRID SQUARE ////////////////////////////////////
class GridSquare {

  /**
   * @classdesc Downloads JP2 images corresponding to 100^2 km MGRS grids that match a particular MGRS grid zone, generates an composite RGB image from separate color band images, tilizes the composite image, generates and deploys Panoptes subjects
   * @param {Number} gridZone  Numerical value representing the UTM zone that defines a 6-deg wide zone (1-60)
   * @param {String} latBand   Latitude band letter that intersects with the UTM zone number, both of which make up the grid zone designator (GZD), which defines a 6 x 8-deg region on the globe
   * @param {String} squareId  Two letters designating a row and column within the GZD corresponding to a 100^2 km region
   */

  constructor(gridZone, latBand, squareId) {
    this.gridZone = gridZone;
    this.latBand = latBand;
    this.squareId = squareId;
    this.path = null;   // the path to the instance's own data directory
    this.imgMeta = {};  // a place to store important image data
  }

  downloadData(callback) {
    console.log('downloadData()'); // DEBUG
    async.waterfall([
      this.getTileInfoKeysAtPosition.bind(this),
      this.pickLatestTileInfoFile.bind(this),
      this.downloadImagesFromS3.bind(this)
    ], callback);
  }

  pickLatestTileInfoFile(tileInfoKeys, callback) {
    console.log('pickLatestTileInfoFile()');
    let latestTileInfoKey = tileInfoKeys.sort()[tileInfoKeys.length-3].Prefix; // get latest images only
    downloadFromS3(bucket, latestTileInfoKey, 'data/' + latestTileInfoKey, function(err, resp) {
      if (err) throw err;
      let data = JSON.parse(resp.httpResponse.body);
      this.imgMeta = { tileGeometry: data.tileGeometry.coordinates, cloudyPixelPercentage: data.cloudyPixelPercentage };
      this.path = path.normalize('./data/'+data.path); // get path to image files
      callback(null, data.path);
    }.bind(this));
  }

  createRGBComposite(callback) {
    console.log('createRGBComposite()'); // DEBUG
    let files = fs.readdirSync(this.path);
    var bandR, bandG, bandB = '';
    for(let file of files) {
      if(file.match(/B02.jp2$/i)){ bandB = `${this.path}/${file}` };
      if(file.match(/B03.jp2$/i)){ bandG = `${this.path}/${file}` };
      if(file.match(/B04.jp2$/i)){ bandR = `${this.path}/${file}` };
    }

    if( !bandB && !bandG && !bandR ) {
      callback('Error: Missing at least one band.');
    }

    let outfile = `${this.path}/composite.tif`;

    // create RGB composite image

    // set up merge and translate parameters
    let mergeParams = {
      verbose: false,
      noDataValue: 0,                 // ignore pixels being merged with this value
      outputNoDataValue: 0,           // assign specific no-data value to output bands
      separate: true,                 // place input file in separate band
      outputFormat: 'GTiff',          // specify output format (defaults to GeoTIFF)
      infiles: [bandR, bandG, bandB],
      outfile: outfile
    }

    let translateParams = {
      outputType: 'Byte',             // set data type for output bands
      scale: [0, 2000, 0, 255],       // rescale input values to desired range
      infile: outfile,
      outfile: outfile.replace(/composite/g, 'composite_scaled')
    }

    async.series([
      async.apply(gdalUtils.merge, mergeParams),
      async.apply(gdalUtils.translate, translateParams)
    ], (err, result) => {
      if(err) callback(err);
      console.log('RESULT = ', result);
      callback(null, result[result.length-1]);
    });

  }

  /**
   * Uses the tileGeometry property (from tileInfo.json) to convert UTM coordinates to lat/lon
   * @returns {Object} cornerCoords
   * @returns {number} cornerCoords.upper_left
   * @returns {number} cornerCoords.upper_right
   * @returns {number} cornerCoords.bottom_right
   * @returns {number} cornerCoords.bottom_left
   */
  getCornerCoords() {
    let cornerPoints = this.imgMeta.tileGeometry[0].slice(0,4);
    return {
      upper_left:   utm.convertUtmToLatLng(cornerPoints[0][0], cornerPoints[0][1], this.gridZone, this.latBand),
      upper_right:  utm.convertUtmToLatLng(cornerPoints[1][0], cornerPoints[1][1], this.gridZone, this.latBand),
      bottom_right: utm.convertUtmToLatLng(cornerPoints[2][0], cornerPoints[2][1], this.gridZone, this.latBand),
      bottom_left:  utm.convertUtmToLatLng(cornerPoints[3][0], cornerPoints[3][1], this.gridZone, this.latBand),
    };
  }

 /**
  * Fetches list of all tileInfo.json files belonging to AOI
  *
  */
  getTileInfoKeysAtPosition(callback) {
    console.log('getTileInfoKeysAtPosition()'); // DEBUG
    // Get list of available tileInfo.json files
    let params = {
      Bucket: bucket,
      EncodingType: 'url',
      Prefix: `tiles/${this.gridZone}/${this.latBand}/${this.squareId}/`,
      Delimiter: 'tileInfo.json'
    }
    s3.listObjects( params, function(err, data) {
      if(err) throw err;
      callback(null, data.CommonPrefixes);
    });
  }

  /**
   * Downloads JP2 images for red, green, and blue channels
   */
  downloadImagesFromS3(path, callback) {
    console.log('downloadImagesFromS3()', path); // DEBUG
    let fileList = [
      'B02.jp2', // blue
      'B03.jp2', // green
      'B04.jp2', // red
    ];

    async.map(fileList, function(file, callback) {
      let awsKey = `${path}/${file}`;
      let dest = `./data/${awsKey}`;
      if(fs.existsSync(dest)) {
        console.log('Using cached image. Note: Caching is currently hard-coded!'); // Note: Hard coded caching! Fix when possible.
        callback(null);
      } else {
        downloadFromS3(bucket, awsKey, dest, callback);
      }
    }.bind(path), callback);
  }

} // end of class

///////////////////////////// SENTINEL MOSAIC //////////////////////////////////

class SentinelMosaic {
  constructor(aoi, projectId, subjectSetId, status) {
    this.aoi = aoi;
    this.projectId = projectId;
    this.subjectSetId = subjectSetId;
    this.status = status;
    this.gridSquares = [];
  }

  fetchData(callback) {
    console.log('Fetching data...');
    let mgrsTiles = this.boundsToMgrsTiles(this.aoi.bounds);
    this.gridSquares = mgrsTiles.map((mgrsPosition, i) => {
      let mgrs = this.splitMgrsPosition(mgrsPosition);
      return new GridSquare(mgrs.gridZone, mgrs.latBand, mgrs.squareId);
    });
    async.forEachOf(this.gridSquares, function(gridSquare, i, callback) {
      gridSquare.downloadData( function(err, result) {
        if(err) throw err;
        console.log(' Finished executing downloadData()');
        callback(null);
      });
    }, function(err) {
      if(err) throw err;
      callback(null);
    }.bind(this));
  }

  processData(callback) {
    console.log('processData()');
    async.mapSeries(this.gridSquares, function(item, callback){
      item.createRGBComposite( function(err,imgFilename) {
        let params = {
          cornerCoords: item.getCornerCoords(),
          width: item.imgMeta.width,
          height: item.imgMeta.height
        };
        console.log('Tilizing images...');
        tilizeImage.tilize(imgFilename, 480, 160, params, function(err,result) {
          if(err) throw err;
          callback(null, result);
        });
      });
    }, function(err, results) {
      if(err) throw err;
      callback(null, results);
    });
  }

  // Take bounds and return a list of Mgrs tiles
  boundsToMgrsTiles(bounds) {
    console.log('boundsToMgrsTiles()'); // DEBUG
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
  splitMgrsPosition(mgrsPosition) {
    // split MGRS position, e.g. '45RUL' into constituent parts
    let str = mgrsPosition.match(/[a-z]+|\d+/ig)
    let gridZone = str[0];            // 45
    let latBand  = str[1].slice(0,1); // R
    let squareId = str[1].slice(1);   // UL
    return {gridZone, latBand, squareId}
  }

} // end of class

module.exports = SentinelMosaic;
