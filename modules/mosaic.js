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
      }, callback);
    });
  }

  /**
   * Creates tiles for an AOI
   * @param  {AOI}      aoi
   * @param  {Function} callback
   */
  createTilesForAOI(aoi, callback) {
    // Fetch files
    this.fetchFilesForAOI(aoi, (err, files) => {
      if (err) return callback(err);

      // Tile em up
      var tasks = [];
      for (var file of files) {
        tasks.push(async.apply(tilizeImage.tilize, file, 480, 160));
      }
      async.series(tasks, (err, tilesByQuad) => {
        var mosaicTiles = [];
        for (var tiles of tilesByQuad) {
          mosaicTiles = mosaicTiles.concat(tiles);
        }
        callback(err, mosaicTiles.sort());
      });
    });
  }
}

module.exports = Mosaic;
