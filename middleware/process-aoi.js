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
      // Send job to queue
      queue.push(path.join(UPLOAD_PATH, req.file.filename))

      // Send confirmation
      res.send('Upload complete, subject fetch job queued')
      // res.redirect('https://localhost:3443/builds')

    } else {
      res.redirect(config.host + '/builds')
      // Start job, ensuring correct working directory
      var script = 'generate-planet-labs-subjects'
      var aoi_file = req.file.path
      var job = fork(script, [project_id, subject_set_id, aoi_file])

      job.on('message', (status) => {
        io.emit('build status', {status: status})
      })
    }
  }
}
