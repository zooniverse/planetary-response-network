'use strict';
const async = require('async');
const mkdirp = require('mkdirp');
const PlanetAPI = require('./planet-api');

class Quad {

  /**
   * @param  {Mosaic}  mosaic  The mosaic to which this quad belongs
   * @param  {Object}  feature  The geoJSON feature
   */
  constructor(mosaic, feature) {
    this.mosaic = mosaic;
    this.feature = feature;
  }

  /**
   * Ensures the download dir for the quad's mosaic exists
   * @param  {Function}  callback
   */
  ensureDownloadDir(callback) {
    var dir ='data/' + encodeURIComponent(this.feature.properties.links.mosaic);
    mkdirp(dir, err => {
       callback(err, dir);
    });
  }

  /**
   * Download the files for the quad
   * @param  {Function}  callback
   */
  download(callback) {
    // Ensure download dir
    this.ensureDownloadDir((err, dir) => {
      if (err) throw err;

      // TODO use this.mosaic.provider to determine download link and method

      var url = this.feature.properties.links.full;
      var basename  = url.split('/')[7]
      var dest      = dir + '/' + basename + '_' + '.tif'

      PlanetAPI.downloadFile({ url: url, dest: dest }, (err, file) => {
        callback(err, file);
      });
    });
  }
}

module.exports = Quad;