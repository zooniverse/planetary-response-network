const redis = require('../lib/redis');
const async = require('async');

module.exports = (req, res, next) => {
  if (req.user) {
    redis.lrange('user:'+req.user.get('id')+':jobs', 0, -1, function(err, jobIds) {
      async.map(jobIds, (jobId, done) => {
        redis.get('job:'+jobId, (err, job) => {
          if (err) return done(err);
          try {
            job = JSON.parse(job)
          } catch (e) {
            done(e);
          }
          redis.get('job:'+jobId+':status', (err, status) => {
            if (err) return done(err);
            try {
              job.status = JSON.parse(status)
            } catch (e) {
              done(e);
            }
            done(null, job);
          })
        })
      }, (err, jobs) => {
        if (err) return next(err);
        res.send(jobs);
      });
    });
  } else {
    next();
  }
};
