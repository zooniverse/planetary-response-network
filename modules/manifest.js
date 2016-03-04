'use strict';

const async = require('async');
const csvStringify = require('csv-stringify');
const imgMeta = require('./image-meta');

class Manifest {
  
  /**
   * @param  {Array<Array<String>>}  filesByMosaic  List of mosaic file lists 
   */
  constructor(filesByMosaic) {
    this.filesByMosaic = filesByMosaic;
  }
  
  /**
   * Creates sets of files, one each from each mosaic's files per set. This assumes that the tiles in each mosaic are in order and of the same geographic region
   * @param  {Function}  callback
   */
  createFileTuples(callback) {
    var tasks = [];
    var fileTuples = [];
    var i = 0;
    for (var file of this.filesByMosaic[0]) {
      let tuple = [];
      for (var mosaicFiles of this.filesByMosaic) {
        tuple.push(mosaicFiles[i]);
      }
      fileTuples.push(tuple);
      tasks.push(async.apply(this.generateRow.bind(this), tuple));
      i++;
    }
    async.series(tasks, callback);
  }
  
  /**
   * Generates the manifest content
   * @param  {Function}  callback
   */
  generate(callback) {
    // Pair up files across mosaics
    this.createFileTuples((err, rows) => {
      var header = [];
      for (var i = 0; i < this.filesByMosaic.length; i++) {
        header.push('image'+ (i + 1))
      }
      header = header.concat([
        'upper_left_lon',
        'upper_left_lat',
        'upper_right_lon',
        'upper_right_lat',
        'bottom_right_lon',
        'bottom_right_lat',
        'bottom_left_lon',
        'bottom_left_lat',
        'center_lon',
        'center_lat'
      ]);
      rows.splice(0, 0, header);
      csvStringify(rows, callback);
    });
  }

  /**
   * Generates a manifest row from a set of files
   * @param  {Array<String>}  fileSet
   * @param  {Function}       callback 
   */
  generateRow(fileSet, callback) {
    imgMeta.read(fileSet[0], ['-userComment'], function (err, metadata) {
      if (err) return callback(err);

      try {
        var coords = JSON.parse(decodeURIComponent(metadata["userComment"]));

        var row = fileSet.concat([
          coords.upper_left.lon,
          coords.upper_left.lat,
          coords.upper_right.lon,
          coords.upper_right.lat,
          coords.bottom_right.lon,
          coords.bottom_right.lat,
          coords.bottom_left.lon,
          coords.bottom_left.lat,
          coords.center.lon,
          coords.center.lat
        ]);
        callback(null, row)
      } catch (e) {
        callback(e)
      }
    })
  }

}

module.exports = Manifest;