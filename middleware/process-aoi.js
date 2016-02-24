'use strict'
const path = require('path')
const queue = require('../lib/queue')
const UPLOAD_PATH = path.join(__dirname,'../uploaded_aois')

module.exports = function (req, res, next) {
  // Send job to queue
  queue.push(path.join(UPLOAD_PATH, req.file.filename))

  // Send confirmation
  res.header('Content-Type', 'text/plain')
  res.send('Upload complete, subject fetch job queued')
}
