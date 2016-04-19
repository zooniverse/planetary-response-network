'use strict';

const async        = require('async');
const csvStringify = require('csv-stringify');
const fs           = require('fs');
const imgMeta      = require('./image-meta');
const panoptesAPI  = require('./panoptes-api');
const uploadToS3   = require('./upload-to-s3');
const path         = require('path');

class Manifest {

  /**
   * @classdesc Manifests are responsible for generating subjects from mosaic files and uploading them to Panoptes
   * @param  {Array<Mosaic>}         mosaics        List of mosaics included in the manifest
   * @param  {Aoi}                   aoi            An area of interest to use
   * @param  {Number}                projectId      Id of Panoptes project to which subjects should be sent
   * @param  {Number}                subjectSetId   Id of Panoptes subject set to which subjects should be sent
   * @param  {User}                  user           User running the job
   */
  constructor(mosaics, aoi, projectId, subjectSetId, status, user) {
    this.mosaics = mosaics;
    this.aoi = aoi;
    this.projectId = projectId;
    this.subjectSetId = subjectSetId;
    this.status = status;
    this.user = user;
  }

  /**
   * Generates the manifest subjects, each with one image from each mosaic. This assumes that the tiles in each mosaic are in order and of the same geographic region
   * @param  {Function}  callback
   * @returns {Object[]}  subjects - Metadata from subjects
   * @returns {Object}    subjects[].metadata
   * @returns {Object}    subjects[].metadata.upper_left
   * @returns {Number}    subjects[].metadata.upper_left.lon - Longitude value
   * @returns {Number}    subjects[].metadata.upper_left.lat - Latitude value
   * @returns {Object}    subjects[].metadata.upper_right
   * @returns {Number}    subjects[].metadata.upper_right.lon - Longitude value
   * @returns {Number}    subjects[].metadata.upper_right.lat - Latitude value
   * @returns {Object}    subjects[].metadata.bottom_right
   * @returns {Number}    subjects[].metadata.bottom_right.lon - Longitude value
   * @returns {Number}    subjects[].metadata.bottom_right.lat - Latitude value
   * @returns {Object}    subjects[].metadata.bottom_left
   * @returns {Number}    subjects[].metadata.bottom_left.lon - Longitude value
   * @returns {Number}    subjects[].metadata.bottom_left.lat - Latitude value
   * @returns {Object[]}  subjects[].metadata.locations
   * @returns {String}    subjects[].metadata.locations[].image_uri - URI to image asset
   * @returns {Object}    subjects[].metadata.links
   * @returns {Number}    subjects[].metadata.links.project - Zooniverse project id
   * @returns {Array}     subjects[].metadata.links.subject_sets
   * @returns {Number}    subjects[].metadata.links.subject_sets[].subject_set_id - Zooniverse subject set id
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
        this.generateManifest(subjects);
        callback(err, subjects);
      });
    });
  }

  /**
   * Generates a CSV manifest for manual uploads via PFE
   */
  generateManifest(subjects, callback) {
    console.log('Generating manifest...'); // --STI
    let csvData = [],
        maxLocations = 0,
        outputPath = '';
    for(let subject of subjects) {
      maxLocations = subject.locations.length;
      outputPath = path.dirname( subject.locations[0]['image/jpeg'] );
      csvData.push([
        ...[...subject.locations].map( (location) => path.basename( location['image/jpeg'] ) ),
        subject.metadata.upper_left.lon,
        subject.metadata.upper_left.lat,
        subject.metadata.upper_right.lon,
        subject.metadata.upper_right.lat,
        subject.metadata.bottom_right.lon,
        subject.metadata.bottom_right.lat,
        subject.metadata.bottom_left.lon,
        subject.metadata.bottom_left.lat,
        subject.metadata.center.lon,
        subject.metadata.center.lat
      ]);
    }

    let imageLabels = [];
    for(let i=0; i<maxLocations; i++) {
      imageLabels.push(`image${i+1}`);
    }
    csvData.splice(0, 0, [ ...imageLabels, 'upper_left_lon', 'upper_left_lat', 'upper_right_lon', 'upper_right_lat', 'bottom_right_lon', 'bottom_right_lat', 'bottom_left_lon', 'bottom_left_lat', 'center_lon', 'center_lat' ] );
    // callback(csvData, null);
    csvStringify(csvData, function(error, stringifiedData) {
      fs.writeFile(`${outputPath}/manifest.csv`, stringifiedData);
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
      this.deploySubjectsToPanoptes.bind(this)
    ], callback);
  }

  deploySubjectsToPanoptes(subjects, callback) {
    console.log('Deploying subjects to Panoptes...'); // --STI
    this.status.update('deploying_subjects', 'in-progress');
    panoptesAPI.saveSubjects(this.user, subjects, function(err){
      if(err) {
        console.log(err);
        return this.status.update('deploying_subjects', 'error', () => {
          callback(err);
        });
      }
      // if successful...
      this.status.update('deploying_subjects', 'done', callback);
    }.bind(this));
  }

  uploadSubjectsImages(subjects, callback){
    console.log('Uploading images...');
    this.status.update('uploading_images', 'in-progress');
    async.mapSeries(subjects, this.uploadSubjectImagesToS3.bind(this), function(err, subjects){
      if (err) callback(err)
      this.status.update('uploading_images', 'done');
      callback(null, subjects)
    }.bind(this));
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
