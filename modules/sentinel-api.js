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
    console.log('Using MGRS tiles: ', mgrsTiles);
    if(mgrsTiles.length > 4) {
      callback('ERROR: Only 4 MGRS tiles per AOI allowed. Reduce the size of the region.');
    }
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

  // Description: Takes bounds from AOI polygon and fits a rectangular grid with sampled points at every 0.4-deg interval
  // Returns the minimum list of MGRS squares containing the AOI
  boundsToMgrsTiles(bounds) {
    if(bounds.length < 0) {
      console.log('No points!');
      return null;
    }

    let mgrsTiles = new Array(),
        latValues = [],
        lonValues = [];

    // extract lat/lon values from polygon
    for(let i=0; i<bounds.length-1; i++) { // ignore last point in polygon (same as first)
      lonValues.push( bounds[i][0] );
      latValues.push( bounds[i][1] );
    }

    // sub-sample intervals to ensure all mgrs grid squares are registered
    let sampledLats = this.subsampleRange(latValues),
        sampledLons = this.subsampleRange(lonValues);

    for(let lon of sampledLons) {
      for(let lat of sampledLats) {
        // console.log(parseFloat(lat) + ',' + parseFloat(lon) ); // DEBUG
        let gridSquareId = mgrs.forward([lon,lat]);
        mgrsTiles.push(gridSquareId.slice(0,5));
      }
    }

    return Array.from( new Set( mgrsTiles.sort() ) ); // remove any duplicates
  }

  subsampleRange(values) {
    let max = Math.max.apply(null, values),
        min = Math.min.apply(null, values),
        sampledValues = [],
        step = 0.4; // set step interval small enough to not skip grid squares

    for( let val = min; val <= max; val = val + step ) {
      sampledValues.push(val);
    }
    return sampledValues;
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
