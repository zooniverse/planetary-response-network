'use strict'
const fork = require('child_process').fork
const path = require('path')
const queue = require('../lib/queue')
const UPLOAD_PATH = path.join(__dirname,'../uploaded_aois')
const config = require('./config.json')

exports.runner = function (io, options){
  return function (req, res, next) {

    var project_id = req.body.project_id
    var subject_set_id = req.body.subject_set_id
    res.header('Content-Type', 'text/plain')

    if (options.useQueue) {
      console.log('Sending job to queue...');
      console.log('UPLOAD_PATH = ', UPLOAD_PATH);
      console.log('req.file.filename = ', req.file.filename);
      // Send job to queue
      var payload = {
        aoi_file: path.join(UPLOAD_PATH, req.file.filename),
        project_id: project_id,
        subject_set_id: subject_set_id
      }

      console.log('BEFORE PAYLOAD: ', payload);
      // queue.push( path.join(UPLOAD_PATH, req.file.filename) )
      queue.push( payload )
      // Send confirmation
      // res.send('Upload complete, subject fetch job queued')
      res.redirect(config.host + '/builds')

    } else {
      console.log('Running job locally without queue...');
      res.redirect(config.host + '/builds')
      // Start job, ensuring correct working directory
      var script = 'generate-planet-labs-subjects'
      // var script = 'build-status-test' // test script for build-status
      var aoi_file = req.file.path
      var job = fork(script, [project_id, subject_set_id, aoi_file])

      job.on('message', (message) => {
        io.emit('build status', message)
      })
    }
  }
}
