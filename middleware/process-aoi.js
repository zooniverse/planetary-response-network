'use strict'
const fork   = require('child_process').fork
const path   = require('path')
const async  = require('async')
const queue  = require('../lib/queue')
const redis  = require('../lib/redis')

const UPLOAD_PATH = path.join(__dirname,'../uploaded_aois')

exports.runner = function (options){
  return function (req, res, next) {

    var project_id = req.body.project_id
    var subject_set_id = req.body.subject_set_id
    var repeat = req.body.repeat
    var interval = req.body.interval
    var redirect_uri = req.query.redirect

    if (options.useQueue) {
      // Create job data
      var jobInfo = {
        aoi_file: path.join(UPLOAD_PATH, req.file.filename),
        project_id: project_id,
        subject_set_id: subject_set_id,
        user_id: req.user.get('id')
      }
      // Send job to redis queue
      queue.push(jobInfo, repeat, interval, function(err, job_ids) {
        console.log('jobs sent', job_ids)
        // Create records for each repeat of job
        async.map(job_ids, (job_id, done) => {
          var job = Object.assign({}, {
            id: job_id
          }, jobInfo)
          redis.set('job:'+job_id, JSON.stringify(job), done)
        }, (err, jobs) => {
          if (err) return next(err)
          // Add job id to user's job list
          // TODO get oauth working so we know which user this is
          redis.rpush('user:'+req.user.get('id')+':jobs', job_ids, (err, status) => {
            if (err) return next(err)
            res.redirect(redirect_uri)
          })
        })
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
        '--user-id', req.user.get('id'),
        aoi_file
      ])
    }

  }
}
