'use strict';
const async       = require('async');
const Quad        = require('./quad');
const PlanetAPI   = require('./planet-api');
const tilizeImage = require('./tilize-image');

class Mosaic {

  constructor(provider, label, url, status) {
    this.provider = provider;
    this.label = label;
    this.url = url;
    this.status = status;
  }

  /**
   * Fetches quads from this mosaic intersecting with an AOI
   * @param  {AOI}      aoi
   * @param  {Function} callback
   */
  fetchQuadsForAOI(aoi, callback){
    this.status.update('fetching_mosaics', 'in-progress');
    PlanetAPI.fetchQuadsFromAOI(aoi.bounds, this.url, this.label, (err, quads) => {
      console.log('QUADS: ', quads);
      if (err) {
        this.status.update('fetching_mosaics', 'error');
        throw err;
      }
      quads = quads.features.map(quad => {
        return new Quad(this, quad)
      })
      this.status.update('fetching_mosaics', 'done');
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
      this.status.update('tilizing_mosaics', 'in-progress');
      var tasks = [];
      for (var file of files) {
        tasks.push(async.apply(tilizeImage.tilize, file, 480, 160));
      }
      async.series(tasks, (err, tilesByQuad) => {
        var mosaicTiles = [];
        for (var tiles of tilesByQuad) {
          mosaicTiles = mosaicTiles.concat(tiles);
        }
        this.status.update('tilizing_mosaics', 'done');
        callback(err, mosaicTiles.sort());
      });
    });
  }
}

module.exports = Mosaic;
