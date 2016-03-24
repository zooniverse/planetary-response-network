'use strict'
const fork   = require('child_process').fork
const path   = require('path')
const queue  = require('../lib/queue')

const UPLOAD_PATH = path.join(__dirname,'../uploaded_aois')
const redirect_uri = 'https://localhost:3443/builds'

exports.runner = function (options){
  return function (req, res, next) {

    var project_id = req.body.project_id
    var subject_set_id = req.body.subject_set_id
    res.header('Content-Type', 'text/plain')

    if (options.useQueue) {
      var jobInfo = {
        aoi_file: path.join(UPLOAD_PATH, req.file.filename),
        project_id: project_id,
        subject_set_id: subject_set_id
      }
      queue.push(jobInfo, function(job_id){
        res.redirect(redirect_uri + '?job_id=' + job_id)
      }) // send job to message queue

    } else {
      res.redirect(redirect_uri)
      var script = 'generate-subjects' //'build-status-simulator' //'generate-subjects'
      var aoi_file = req.file.path
      var job = fork(script, [
        '--job-id', 'jobid.'+Math.floor(Math.random()*(9999-1000)+1000), // generate a random job id
        '--mosaics',
          // TO DO: these probably shouldn't be hard-coded
          // 'https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/',
          // 'https://api.planet.com/v0/mosaics/nepal_3mo_pre_eq_mag_6_mosaic/quads/',
          'https://api.planet.com/v0/mosaics/open_california_re_20131201_20140228/quads/',
          'https://api.planet.com/v0/mosaics/open_california_re_20141201_20150228/quads/',
        '--project', project_id,
        '--subject-set', subject_set_id,
        aoi_file
      ])
    }

  }
}
