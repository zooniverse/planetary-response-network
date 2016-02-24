'use strict'
const fork = require('child_process').fork
const path = require('path')
const queue = require('../lib/queue')

const UPLOAD_PATH = path.join(__dirname,'../uploaded_aois')

module.exports = function (options) {
  return function (req, res, next) {
    if (options.useQueue) {
      // Send job to queue
      queue.push(path.join(UPLOAD_PATH, req.file.filename))

      // Send confirmation
      res.header('Content-Type', 'text/plain')
      res.send('Upload complete, subject fetch job queued')
    } else {
      res.send('Upload complete, starting subject fetch job')
      // Start job, ensuring correct working directory
      var script = 'planet-api-before-after-test'
      var job = fork(script, [req.file.path])
    }
  }
}