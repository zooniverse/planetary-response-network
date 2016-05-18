'use strict';
const redis = require('../lib/redis');
const async = require('async');

module.exports = (req, res, next) => {
  let user_id  = req.user.get('id'),
      job_id = req.params.job_id;
  if(req.user) {

    removeJob(user_id, job_id, (err, rmCount) => {
      console.log('REMOVED %d JOB(S)', rmCount); // --STI
      getJobs(user_id, (err, jobs) => {
        console.log('FINISHED GETTING JOBS:', jobs); // --STI
        res.send(jobs); // send updated job list to front-end
      });
    });
  } else {
    next();
  }
};

function removeJob(user_id, job_id, callback) {
  redis.lrem('user:'+user_id+':jobs', 0, job_id, function(err, rmCount) {
    if(err) {
      return callback(err);
    } else if(rmCount <= 0) {
      callback('Unable to process delete request for job: ' + job_id + '. Could not find any jobs with provided id.')
    }
    callback(null, rmCount);
  });
}

function getJobs(user_id, callback) {
  redis.lrange('user:'+user_id+':jobs', 0, -1, (err, jobIds) => {
    async.map(jobIds, (jobId, callback) => {
      findJobByID(jobId, (err, job) => {
        if(err) callback(err);
        callback(err, job);
      });
    }, (err, jobs) => {
        callback(err, jobs);
    });
  });
}

function findJobByID(jobId, callback) {
  console.log('FINDING JOB WITH ID: ', jobId); // --STI
  redis.get('job:'+jobId, (err, job) => {
    if (err) return callback(err);
    try {
      job = JSON.parse(job)
    } catch (e) {
      callback(e);
    }
    redis.get('job:'+jobId+':status', (err, status) => {
      if (err) return callback(err);
      try { // check for status field
        job.status = JSON.parse(status)
      } catch (e) {
        callback(e);
      }
      callback(null, job);
    });
  });
}
