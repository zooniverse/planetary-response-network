'use strict'
const fork = require('child_process').fork
const path = require('path')
const queue = require('../lib/queue')
const UPLOAD_PATH = path.join(__dirname,'../uploaded_aois')

var status = {} // this won't work for queued stuff

// module.exports = function (options) {
exports.runner = function (options){
  return function (req, res, next) {
    var project_id = req.body.project_id
    var subject_set_id = req.body.subject_set_id
    res.header('Content-Type', 'text/plain')
    if (options.useQueue) {
      // Send job to queue
      queue.push(path.join(UPLOAD_PATH, req.file.filename))

      // Send confirmation
      res.send('Upload complete, subject fetch job queued')
      // res.redirect('https://localhost:3443/builds')

    } else {
      res.redirect('https://localhost:3443/builds')
      // Start job, ensuring correct working directory
      var script = 'generate-planet-labs-subjects'
      var aoi_file = req.file.path
      var job = fork(script, [project_id, subject_set_id, aoi_file])

      job.on('message', (message) => {
        console.log('PROCESS-AOI RECEIVED MESSAGE: ', message)
        status = message
      })
    }
  }
}

exports.getStatus = function (options) {
  return function (req, res, next) {
    console.log('STATUS IS: ', status);
    res.send(status)
  }
}
