'use strict';
const redis = require('../lib/redis');
const async = require('async');

module.exports = (req, res, next) => {
  let user_id  = req.user.get('id'),
      job_id = req.params.job_id;
  if(req.user) {

    removeJob(user_id, job_id, (err, rmCount) => {
      console.log('REMOVED %d JOB(S)', rmCount); // --STI
      res.status(204); // Success, empty body
      res.send();
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
