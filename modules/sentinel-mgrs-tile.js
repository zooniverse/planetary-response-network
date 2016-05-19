'use strict';

const path      = require('path');
const fs        = require('fs');
const mkdirp    = require('mkdirp');
const async     = require('async');
const AWS       = require('aws-sdk');
const gdalUtils = require('./gdal-utils');
const utmObj    = require('utm-latlng');

const utm = new utmObj();

const bucket = 'sentinel-s2-l1c';
const region = 'eu-central-1';
const s3 = new AWS.S3({region: region});

function downloadFromS3(bucket, key, dest, callback) {
  // console.log('downloadFromS3() {bucket: %s, key: %s, dest: %s}', bucket, key, dest); // DEBUG

  mkdirp(path.dirname(dest), function(err) { // ensure dest dir exists
    if(err) throw err;
    var file = require('fs').createWriteStream(dest);
    let req = s3.getObject({ Bucket: bucket, Key: key}); //.createReadStream().pipe(file);
    req.on('httpData', function(chunk) { file.write(chunk); });
    req.on('httpDone', function(resp) {
      // console.log('resp: ', JSON.parse(resp.httpResponse.body) );
      file.end();
      console.log('  Finished downloading %s', dest);//resp.request.params.Key);
      callback(null, dest);
    }).send();
  });
}

class SentinelMGRSTile {

  /**
   * @classdesc Downloads JP2 images corresponding to 100^2 km MGRS grids that match a particular MGRS grid zone, generates an composite RGB image from separate color band images, tilizes the composite image, generates and deploys Panoptes subjects
   * @param {Number} gridZone  Numerical value representing the UTM zone that defines a 6-deg wide zone (1-60)
   * @param {String} latBand   Latitude band letter that intersects with the UTM zone number, both of which make up the grid zone designator (GZD), which defines a 6 x 8-deg region on the globe
   * @param {String} squareId  Two letters designating a row and column within the GZD corresponding to a 100^2 km region
   */

  constructor(options) {
    if(options.path) { // used to download images in AWS S3 bucket pack
      this.awsKey = options.path.replace(/\/$/, ''); // remove trailing slashes
    } else { // use latest data from MGRS region
      this.gridZone = options.gridZone;
      this.latBand = options.latBand;
      this.squareId = options.squareId;
      this.awsKey = null;
    }

    this.imgMeta = {};  // a place to store important image data
  }

  downloadData(callback) {
    // console.log('downloadData()'); // DEBUG
    async.waterfall([
      this.getTileInfoKeysAtPosition.bind(this),
      this.pickLatestTileInfoFile.bind(this),
      this.downloadImagesFromS3.bind(this)
    ], (err, result) => {
      callback(null, result);
    });
  }

  getImagesFromURI(key, callback) {
    let dest = path.join('./data', path.dirname(key).replace(/\//g, '_'), 'tileInfo.json' );
    downloadFromS3(bucket, key, dest, (err, tileInfoFile) => {
      if(err) callback(err);
      let data = fs.readFileSync(tileInfoFile);
      data = JSON.parse(data);
      this.awsKey = path.normalize(data.path).replace(/\/$/, ''); // get path to image files (remove trailing slashes)
      this.imgMeta = {
        tileGeometry: data.tileGeometry.coordinates,
        cloudyPixelPercentage: data.cloudyPixelPercentage
      };
      callback(null);
    });
  }

  pickLatestTileInfoFile(tileInfoKeys, callback) {
    let latestTileInfoKey = tileInfoKeys.sort()[tileInfoKeys.length-1] + '/tileInfo.json'; // get latest images only
    let destPath = path.dirname(latestTileInfoKey);
    let destFile = path.basename(latestTileInfoKey);
    let dest = path.join('./data', destPath.replace(/\//g, '_'), destFile);
    this.getImagesFromURI(latestTileInfoKey, callback);

  }

  createRGBComposite(callback) {
    console.log('  Merging bands into RGB image...');
    let filePath = path.join('./data', this.awsKey.replace(/\//g, '_') ); // To do: this is a bit awkward because this.awsKey is really the AWS S3 key that doubles as the local path (sans ./data prefix)
    let files = fs.readdirSync(filePath);
    var bandR, bandG, bandB = '';
    for(let file of files) {
      if(file.match(/B02.jp2$/i)){ bandB = path.join(filePath, file) };
      if(file.match(/B03.jp2$/i)){ bandG = path.join(filePath, file) };
      if(file.match(/B04.jp2$/i)){ bandR = path.join(filePath, file) };
    }

    if( !bandB && !bandG && !bandR ) {
      callback('Error: Missing at least one band.');
    }

    let outfile = path.join(filePath, 'composite.tif');

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

    gdalUtils.merge(mergeParams, (err, result) => {
      gdalUtils.translate(translateParams, (err, result) => {
        if(err) callback(err);
        callback(null, result);
      });
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
    // console.log('getTileInfoKeysAtPosition()'); // DEBUG
    // Get list of available tileInfo.json files
    let params = {
      Bucket: bucket,
      EncodingType: 'url',
      Prefix: `tiles/${this.gridZone}/${this.latBand}/${this.squareId}/`,
      Delimiter: 'tileInfo.json'
    }
    s3.listObjects( params, function(err, data) {
      if(err) throw err;
      console.log('data.CommonPrefixes = ', data.CommonPrefixes);
      let matchingLocations = [];
      for(let index in data.CommonPrefixes) {
        // console.log('PREFIX = ', data.CommonPrefixes[index].Prefix);
        matchingLocations.push( path.dirname( data.CommonPrefixes[index].Prefix ) );
      }
      // callback(null, data.CommonPrefixes);
      callback(null, matchingLocations);
    });
  }

  /**
   * Downloads JP2 images for red, green, and blue channels
   */
  downloadImagesFromS3(callback) {
    // console.log('downloadImagesFromS3()', this.awsKey); // DEBUG
    let fileList = [
      'tileInfo.json', // tile metadata
      'B02.jp2',       // blue
      'B03.jp2',       // green
      'B04.jp2',       // red
    ];

    async.map(fileList, (file, callback) => {
      let awsKey = path.join(this.awsKey, file);
      let dest = path.join('./data', this.awsKey.replace(/\//g, '_'), file);
      // downloadFromS3(bucket, awsKey, dest, callback);
      if(fs.existsSync(dest)) {
        console.log('Using cached image. Note: Caching is currently hard-coded!'); // Note: Hard coded caching! Fix when possible.
        callback(null, dest);
      } else {
        downloadFromS3(bucket, awsKey, dest, function(err, result) {
          if(err) callback(err);
          callback(null, dest);
        });
      }
    }, callback);

  }

}

module.exports = SentinelMGRSTile;
