'use strict'
const fork   = require('child_process').fork
const path   = require('path')
const queue  = require('../lib/queue')
const config = require('../lib/config.json')

const UPLOAD_PATH = path.join(__dirname,'../uploaded_aois')

exports.runner = function (options){
  return function (req, res, next) {

    var project_id = req.body.project_id
    var subject_set_id = req.body.subject_set_id
    res.header('Content-Type', 'text/plain')

    if (options.useQueue) {
      console.log('Sending job to queue...');
      console.log('req.file.filename = ', req.file.filename);
      // Send job to queue
      var payload = {
        aoi_file: path.join(UPLOAD_PATH, req.file.filename),
        project_id: project_id,
        subject_set_id: subject_set_id
      }

      queue.push( payload )
      res.redirect(config.host + '/builds')

    } else {
      console.log('Running job locally without queue...');
      res.redirect(config.host + '/builds')
      var script = 'generate-planet-labs-subjects'
      var aoi_file = req.file.path
      var job = fork(script, [project_id, subject_set_id, aoi_file])

    }
  }
}
