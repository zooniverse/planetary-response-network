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

class GridSquare {
  constructor(gridZone, latBand, squareId) {
    this.gridZone = gridZone;
    this.latBand = latBand;
    this.squareId = squareId;
    this.path = null;
    this.imgMeta = {};
  }

  downloadData(callback) {
    console.log('downloadData()'); // DEBUG
    this.getTileInfoKeysAtPosition(function(err, tileInfoKeys) {
      console.log('Matched \'tileInfo.json\' files:\n', tileInfoKeys.map(function(data){
        return data.Prefix;
      }));
      console.log('Using %s (hard-coded selection)', tileInfoKeys[tileInfoKeys.length-3].Prefix);
      // Note: Currently hard-coded to get the third-latest image (for cloud-cover reasons)
      let latestTileInfoKey = tileInfoKeys.sort()[tileInfoKeys.length-3].Prefix; // get latest images only
      downloadFromS3(bucket, latestTileInfoKey, 'data/' + latestTileInfoKey, function(err, resp) {
        if (err) console.log(err);
        let data = JSON.parse(resp.httpResponse.body);
        this.imgMeta = {
          tileGeometry: data.tileGeometry.coordinates,
          cloudyPixelPercentage: data.cloudyPixelPercentage
        }
        this.path = path.normalize('./data/'+data.path); // get path to image files
        this.downloadImagesFromS3(bucket, function(err) {
          if(err) throw err;
          console.log('Finished downloading images!');
          callback(null);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  }

  createRGBComposite(callback) {
    console.log('createRGBComposite()'); // DEBUG
    fs.readdir(this.path, function(err,files) {
      if(err) throw err;
      let r, g, b = '';
      for(let file of files) {
        if(file.match(/B02.jp2$/i)) { b = `${this.path}/${file}`; }
        if(file.match(/B03.jp2$/i)) { g = `${this.path}/${file}`; }
        if(file.match(/B04.jp2$/i)) { r = `${this.path}/${file}`; }
      }
      if(r == '' || g == '' || b == '') {
        callback('Error: Couldn\'nt generate composite image. Missing at least one color channel.');
      } else {
        let outfilename = `${this.path}/composite.jpg`;
        im.convert([ r, g, b, '-combine', '-normalize', outfilename ] , function(err, strout) {
          if(err) throw err;
          console.log('finished running convert');
          callback(null, outfilename);
        });
      }
    }.bind(this));
  }

  getCornerCoords() {
    let cornerPoints = this.imgMeta.tileGeometry[0].slice(0,4);
    return {
      upper_left:   utm.convertUtmToLatLng(cornerPoints[0][0], cornerPoints[0][1], this.gridZone, this.latBand),
      upper_right:  utm.convertUtmToLatLng(cornerPoints[1][0], cornerPoints[1][1], this.gridZone, this.latBand),
      bottom_right: utm.convertUtmToLatLng(cornerPoints[2][0], cornerPoints[2][1], this.gridZone, this.latBand),
      bottom_left:  utm.convertUtmToLatLng(cornerPoints[3][0], cornerPoints[3][1], this.gridZone, this.latBand),
    };
  }

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

  downloadImagesFromS3(bucket, callback) {
    // console.log('downloadImagesFromS3()', bucket, path); // DEBUG
    let fileList = [
      'B02.jp2', // blue
      'B03.jp2', // green
      'B04.jp2', // red
    ];

    async.forEachOf(fileList, function(file, i, callback) {
      let dest = path.normalize(`${this.path}/${file}`);
      let awsKey = dest.split(path.sep).splice(1).join(path.sep);
      if(fs.existsSync(dest)){
        console.log('File already exists. Skipping.');
        callback(null);
      }
      else {
        downloadFromS3(bucket, awsKey, dest, callback);
      }
    }.bind(this),function(err){
        if(err) throw err;
        callback(null);
    });
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
        console.log(' Finished executing downloadData()');
        if(err) throw err;
        callback(null);
      });
    }, function(err) {
      if(err) throw err;
      callback(null);
    }.bind(this));

    // for(let gridSquare of this.gridSquares) {
    //   gridSquare.downloadData();
    // }

    // for(let mgrsPosition of mgrsTiles) {
    //   this.downloadTileImagesFromPosition(mgrsPosition, function(err, imgMeta) {
    //     this.createRGBComposite(function(err, filename) {
    //       this.cornerCoords = this.getCornerCoords();
    //       // tilizeImage.tilize(tilename, 480, 160, cornerCoords, function(err,result) {
    //       //   if(err) throw err;
    //       //   console.log('Finished tilizing images. ', result);
    //       // }.bind(this));
    //     }.bind(this));
    //   }.bind(this));
    // }
  }

  processData(callback) {
    async.forEachOf(this.gridSquares, function(gridSquare, i, callback) {
      gridSquare.createRGBComposite( function(err,imgFilename) {
        // console.log('COMPOSITE FILE = ', imgFilename);
        // tilizeImage.tilize()
        // console.log('Corner Coords = ', gridSquare.getCornerCoords() );
        // if(err) throw err;
        // callback(null);
      });
    }, function(err) {
      if(err) throw err;
      callback(null);
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

}

module.exports = SentinelMosaic;
