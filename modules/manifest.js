'use strict';

const async          = require('async');
const csvStringify   = require('csv-stringify');
const createSubjects = require('./create-subjects');
const panoptesAPI    = require('./panoptes-api');
const uploadToS3     = require('./upload-to-s3');
const tilizeImage    = require('./tilize-image');
const fs             = require('fs');
const imgMeta        = require('./image-meta');
const path           = require('path');
const exists         = require('../lib/exists');

class Manifest {

  /**
   * @classdesc Manifests are responsible for generating subjects from mosaic files and uploading them to Panoptes
   * @param  {Object}                options
   * @param  {Array<Mosaic>}         options.mosaics        List of mosaics included in the manifest
   * @param  {Aoi}                   options.aoi            An area of interest to use
   * @param  {Array<String>}         options.images         List of image filenames to use as source files instead of fetching from an API
   * @param  {Array<String>}         options.labels         List of labels to overlay on tiles (first label applied to first source file/mosaic, and so on)
   * @param  {Array<String>}         options.labelPos       Where to anchor labels (e.g. "south", "northwest")
   * @param  {Number}                options.projectId      Id of Panoptes project to which subjects should be sent
   * @param  {Number}                options.subjectSetId   Id of Panoptes subject set to which subjects should be sent
   * @param  {User}                  options.user           User running the job
   */
  constructor(options) {
    // Ensure valid combination of options
    if (options.mosaics && !options.aoi || options.aoi && !options.mosaics) {
      throw new Error('If creating subjects from mosaics, you must provide an area of interest, and vice-versa');
    } else if (!options.projectId || !options.subjectSetId || !options.user || !options.status) {
      throw new Error('You must supply a project id, subject set id, user object and status instance');
    } else if (options.mosaics && options.aoi && options.images) {
      throw new Error('Specify either a mosaic with area of interest, or a list of source images, but not both!')
    }
    this.mosaics = options.mosaics;
    this.aoi = options.aoi;
    this.projectId = options.projectId;
    this.subjectSetId = options.subjectSetId;
    this.status = options.status;
    this.user = options.user;
    this.images = options.images;

    this.imOptions = {};
    this.imOptions.equalize = options.equalize;

    if( exists(options.labels) ) {
      this.imOptions.labels = options.labels;
      this.imOptions.labelPos = options.labelPos;
    }

    if (this.images) {
      this.tileSize = options.tileSize;
      this.tileOverlap = options.tileOverlap;
    }
  }

  /**
   * Generates the manifest subjects, each with one image from each mosaic. This assumes that the tiles in each mosaic are in order and of the same geographic region
   * @param  {Function}  callback
   */
  getSubjects(callback) {
    const handler = (err, tileSets) => {
      this.status.update('tilizing_mosaics', 'done');
      createSubjects.subjectsFromTileSets(tileSets, (err, subjects) => {
        if (err) return callback(err);
        subjects = subjects.map(subject => {
          subject.links = {
            project: this.projectId,
            subject_sets: [this.subjectSetId]
          };
          return subject;
        });
        this.generateManifest(subjects); // May want to move this somewhere else?
        callback(null, subjects);
      });
    }

    if (this.images) {
      // Tile provided imagery
      async.mapSeries(this.images, (image, callback) => {
        let options = {
          equalize: this.imOptions.equalize,
          label:    exists(this.imOptions.labels)   ? this.imOptions.labels[this.images.indexOf(image)] : null,
          labelPos: exists(this.imOptions.labelPos) ? this.imOptions.labelPos : null
        }
        tilizeImage.tilize(image, this.tileSize, this.tileOverlap, options, callback);
      }, handler);
    } else {
      // Fetch and tile imagery from mosaics
      async.mapSeries(this.mosaics, (mosaic, callback) => {
        mosaic.createTilesForAOI(this.aoi, callback);
      }, handler);
    }
  }

  /**
   * Generates a CSV manifest for manual uploads via PFE
   */
  generateManifest(subjects, callback) {
    console.log('Generating manifest...'); // To do: use "status" instead
    let csvData = [],
        maxLocations = 0,
        outputPath = '';
    for(let subject of subjects) {
      maxLocations = subject.locations.length;
      outputPath = path.dirname( subject.locations[0]['image/jpeg'] );

      let subjectData = [
        // ...[...subject.locations].map( (location) => path.basename( location['image/jpeg'] ) ), // requires NodeJS ~5.10
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
      ];

      let locations = [];
      for(let location of subject.locations) {
        subjectData.splice(0, 0, path.basename(location['image/jpeg']) );
      }
      csvData.push(subjectData);
    }

    let csvHeader = [ 'upper_left_lon', 'upper_left_lat', 'upper_right_lon', 'upper_right_lat', 'bottom_right_lon', 'bottom_right_lat', 'bottom_left_lon', 'bottom_left_lat', 'center_lon', 'center_lat' ];
    let imageHeaders = [];
    for(let i=0; i<maxLocations; i++) {
      csvHeader.splice(0, 0, `image${i+1}`);
    }
    csvData.splice(0, 0, csvHeader);
    // callback(csvData, null);
    csvStringify(csvData, function(error, stringifiedData) {
      fs.writeFile(`${outputPath}/manifest.csv`, stringifiedData);
    });
  }


  deploy(callback) {
    async.waterfall([
      this.getSubjects.bind(this),
      this.uploadSubjectsImages.bind(this),
      this.deploySubjectsToPanoptes.bind(this)
    ], callback);
  }

  deploySubjectsToPanoptes(subjects, callback) {
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
    let items = this.mosaics || this.images;
    async.series(items.map((item, i) => {
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
