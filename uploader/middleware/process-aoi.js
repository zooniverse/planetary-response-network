'use strict'
const async = require('async')
const createSubjectJob = require('../lib/create-subject-job')

const queue = async.queue(createSubjectJob, process.env.AOI_JOB_CONCURRENCY || 1)

module.exports = function (req, res, next) {
  // Start job
  const job = {
    file: req.file.path,
    username: process.env.ZOONIVERSE_USERNAME,
    password: process.env.ZOONIVERSE_PASSWORD
  }
  queue.push(job)

  // Send confirmation
  res.header('Content-Type', 'text/plain')
  res.send('Upload complete, subject fetch job queued')
}