'use strict';
const mgrs             = require('mgrs');
// const Client           = require('node-rest-client').Client;
const fs               = require('fs');
const async            = require('async');
const im               = require('imagemagick');
const tilizeImage      = require('./tilize-image');
const path             = require('path');
const imgMeta          = require('./image-meta');
const SentinelMGRSTile = require('./sentinel-mgrs-tile');

// Currently not being used (initially for Copernicus API)
// const auth = { user: process.env.SCIHUB_USER, password: process.env.SCIHUB_PASS };
// const client = new Client(auth);

class SentinelMosaic {
  constructor(options) {
    this.aoi = options.aoi;
    this.tileSize = options.tileSize;
    this.tileOverlap = options.tileOverlap;
    this.imOptions = {
      equalize: options.imOptions.equalize,
      label: options.imOptions.label,
      labelPos: options.imOptions.labelPos
    }
    this.status = options.status;
    this.gridSquares = [];
  }

  fetchData(callback) {
    console.log('Fetching data...');
    this.status.update('fetching_mosaics', 'in-progress');
    let mgrsTiles = this.boundsToMgrsTiles(this.aoi.bounds);

    if(mgrsTiles.length > 4) {
      callback('ERROR: Only 4 MGRS tiles per AOI allowed. Reduce the size of the region.');
    }
    console.log('Using MGRS tiles: ', mgrsTiles);
    this.gridSquares = mgrsTiles.map((mgrsPosition, i) => {
      let mgrs = this.splitMgrsPosition(mgrsPosition);
      return new SentinelMGRSTile({
        gridZone: mgrs.gridZone,
        latBand: mgrs.latBand,
        squareId: mgrs.squareId
      });
    });
    async.mapSeries(this.gridSquares,
      function(gridSquare, callback) {
        gridSquare.downloadData(callback);
    }, function(err, results) {
      if(err) {
        this.status.update('fetching_mosaics', 'error');
        throw err;
      }
      this.status.update('fetching_mosaics', 'done');
      callback(null, results);
    }.bind(this));
  }

  processData(callback) {
    // console.log('processData()'); // DEBUG
    this.status.update('tilizing_mosaics', 'in-progress');
    async.mapSeries(this.gridSquares,
      (item, callback) => {
        item.createRGBComposite( (err, imgFilename) => {
          console.log('Tilizing images...');
          tilizeImage.tilize(imgFilename, this.tileSize, this.tileOverlap, this.imOptions, function(err,result) {
            if(err) throw err;
            callback(null, result);
          });
        });

    }, (err, results) => {
      if(err) {
        this.status.update('tilizing_mosaics', 'error');
        throw err;
      }
      this.status.update('tilizing_mosaics', 'done');
      callback(null, results);
    });
  }

  // Take bounds and return a list of Mgrs tiles
  boundsToMgrsTiles(bounds) {
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
