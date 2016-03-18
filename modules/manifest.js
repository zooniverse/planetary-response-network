'use strict';

const async = require('async');
const csvStringify = require('csv-stringify');
const imgMeta = require('./image-meta');
const panoptesAPI = require('./panoptes-api');
const uploadToS3 = require('./upload-to-s3');

class Manifest {

  /**
   * @classdesc Manifests are responsible for generating subjects from mosaic files and uploading them to Panoptes
   * @param  {Array<Mosaic>}         mosaics        List of mosaics included in the manifest
   * @param  {Aoi}                   aoi            An area of interest to use
   * @param  {Number}                projectId      Id of Panoptes project to which subjects should be sent
   * @param  {Number}                subjectSetId   Id of Panoptes subject set to which subjects should be sent
   */
  constructor(mosaics, aoi, projectId, subjectSetId) {
    this.mosaics = mosaics;
    this.aoi = aoi;
    this.projectId = projectId;
    this.subjectSetId = subjectSetId;
  }

  /**
   * Generates the manifest subjects, each with one image from each mosaic. This assumes that the tiles in each mosaic are in order and of the same geographic region
   * @param  {Function}  callback
   */
  getSubjects(callback) {
    // Fetch and tile imagery from mosaics
    async.mapSeries(this.mosaics, (mosaic, callback) => {
      mosaic.createTilesForAOI(this.aoi, callback);
    }, (err, filesByMosaic) => {
      if (err) throw err;
      var tasks = [];
      var fileSets = [];
      for (var i = 0; i < filesByMosaic[0].length; i++) {
        let fileSet = [];
        for (var mosaicFiles of filesByMosaic) {
          fileSet.push(mosaicFiles[i]);
        }
        fileSets.push(fileSet);
        tasks.push(async.apply(this.getSubject.bind(this), fileSet));
        i++;
      }
      async.series(tasks, (err, subjects) => {
        callback(err, subjects);
      });
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

  deploy(callback) {
    async.waterfall([
      this.getSubjects.bind(this),
      this.uploadSubjectsImages.bind(this),
      panoptesAPI.saveSubjects
    ], callback);
  }

  uploadSubjectsImages(subjects, callback){
    console.log('Uploading images...');
    async.mapSeries(subjects, this.uploadSubjectImagesToS3.bind(this), callback);
  }

  uploadSubjectImagesToS3(subject, callback){
    async.series(this.mosaics.map((mosaic, i) => {
      const img = subject.locations[i]['image/jpeg'];
      return async.apply( uploadToS3, img, img, process.env.AMAZON_S3_BUCKET );
    }), function(err, results) {
      if (err) return callback(err)
      // replace local filename with image url
      results.forEach((result, i) => {
        subject.locations[i]['image/jpeg'] = result;
      });
      callback(null, subject);
    });
  }

}

module.exports = Manifest;