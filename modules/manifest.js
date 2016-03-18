'use strict';

const async = require('async');
const csvStringify = require('csv-stringify');
const imgMeta = require('./image-meta');

class Manifest {

  /**
   * @param  {Array<Mosaic>}         mosaics        List of mosaics included in the manifest
   * @param  {Array<Array<String>>}  filesByMosaic  List of mosaic file lists
   */
  constructor(mosaics, projectId, subjectSetId, filesByMosaic) {
    this.mosaics = mosaics;
    this.filesByMosaic = filesByMosaic;
    this.projectId = projectId;
    this.subjectSetId = subjectSetId;
  }

  /**
   * Generates the manifest rows, each with one image from each mosaic. This assumes that the tiles in each mosaic are in order and of the same geographic region
   * @param  {Function}  callback
   */
  getSubjects(callback) {
    var tasks = [];
    var fileTuples = [];
    var i = 0;
    for (var file of this.filesByMosaic[0]) {
      let tuple = [];
      for (var mosaicFiles of this.filesByMosaic) {
        tuple.push(mosaicFiles[i]);
      }
      fileTuples.push(tuple);
      tasks.push(async.apply(this.getSubject.bind(this), tuple));
      i++;
    }
    async.series(tasks, (err, subjects) => {
      callback(err, subjects);
    });
  }

  /**
   * Generates a subject from a set of files
   * @param  {Array<String>}  fileSet
   * @param  {Function}       callback
   */
  getSubject(fileSet, callback) {
    imgMeta.read(fileSet[0], ['-userComment'], (err, metadata) => {
      if (err) return callback(err);

      try {
        var subject = {
          metadata: JSON.parse(decodeURIComponent(metadata["userComment"]))
        };
        subject.locations = this.mosaics.map((mosaic, i) => {
          return { 'image/jpeg': fileSet[i] }
        });
        subject.links = {
          project: this.projectId,
          subject_sets: [this.subjectSetId]
        };
        callback(null, subject);
      } catch (e) {
        callback(e);
      }
    })
  }

}

module.exports = Manifest;