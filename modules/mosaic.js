'use strict';
const async       = require('async');
const Quad        = require('./quad');
const PlanetAPI   = require('./planet-api');
const tilizeImage = require('./tilize-image');

class Mosaic {

  constructor(label, url) {
    this.label = label;
    this.url = url;
  }
  
  /**
   * Fetches quads from this mosaic intersecting with an AOI
   * @param  {AOI}      aoi 
   * @param  {Function} callback 
   */
  fetchQuadsForAOI(aoi, callback){
    PlanetAPI.fetchQuadsFromAOI(aoi.bounds, this.url, this.label, (err, quads) => {
      if (err) throw err;
      
      quads = quads.features.map(quad => {
        return new Quad(this, quad)
      })
      
      callback(null, quads);
    });
  }
  
  /**
   * Fetches quad image files from this mosaic intersecting with an AOI
   * @param  {AOI}      aoi 
   * @param  {Function} callback 
   */
  fetchFilesForAOI(aoi, callback) {
    this.fetchQuadsForAOI(aoi, (err, quads) => {
      async.map(quads, (quad, callback) => {
        quad.download(callback);
      }, (err, files) => {
        this.files = files;
        callback(null, files);
      });
    });
  }
  
  /**
   * Creates tiles for an AOI (fetching files if not already done)
   * @param  {AOI}      aoi 
   * @param  {Function} callback 
   */
  createTilesForAOI(aoi, callback) {
    if (this.files) {
      // Already got files, start tiling
      async.nextTick(this.createTiles.bind(this, callback));
    } else {
      // No files yet, fetch them first
      this.fetchFilesForAOI(aoi, (err, files) => {
        if (err) return callback(err);
        this.createTiles(callback);
      });
    }
  }
  
  /**
   * Creates tiles from the currently available imagery
   * @param  {Function}  callback
   * @private
   */
  createTiles(callback) {
    var tasks = [];
    for (var file of this.files) {
      tasks.push(async.apply(tilizeImage, file, 480, 160));
    }
    async.series(tasks, (err, tilesByQuad) => {
      var mosaicTiles = [];
      for (var tiles of tilesByQuad) {
        mosaicTiles = mosaicTiles.concat(tiles);
      }
      this.tiles = mosaicTiles;
      callback(err, mosaicTiles);
    });
  }
}

module.exports = Mosaic;