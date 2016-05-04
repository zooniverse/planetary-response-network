'use strict';
const async       = require('async');
const Quad        = require('./quad');
const PlanetAPI   = require('./planet-api');
const tilizeImage = require('./tilize-image');

class Mosaic {

  /**
   * @classdesc a Mosaic represents a large image ready to be tiled
   */
  constructor(options) {
    this.provider = options.provider;
    this.imOptions = {
      equalize: options.imOptions.equalize,
      label: options.imOptions.label,
      labelPos: options.imOptions.labelPos
    };
    this.url = options.url;
    this.tileSize = options.tileSize;
    this.tileOverlap = options.tileOverlap;
    this.status = options.status;
  }

  /**
   * Fetches quads from this mosaic intersecting with an AOI
   * @param  {AOI}      aoi
   * @param  {Function} callback
   */
  fetchQuadsForAOI(aoi, callback){
    this.status.update('fetching_mosaics', 'in-progress');
    PlanetAPI.fetchQuadsFromAOI(aoi.bounds, this.url, this.label, (err, quads) => {
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

      let options = this.imOptions;

      tilizeImage.tilizeMany(files, this.tileSize, this.tileOverlap, options, (err, tiles) => {
        if (err) {
          this.status.update('tilizing_mosaics', 'error');
          callback(err);
        } else {
          this.status.update('tilizing_mosaics', 'done');
          callback(null, tiles);
        }
      });
    });
  }
}

module.exports = Mosaic;
