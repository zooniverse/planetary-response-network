const redis = require('../lib/redis');

module.exports = (req, res, next) => {
  // TODO get oauth working so we know who user is
  redis.lrange('user:USER_ID_HERE:jobs', 0, -1, function(err, jobs) {
    if (err) return next(err);
    res.send(jobs);
  });
};