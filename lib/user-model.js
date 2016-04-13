const redis = require('./redis');

const RedisModel = require('./redis-model')(redis);
var User = new RedisModel('User', [
  'accessToken',
  'accessTokenExpiresAt',
  'refreshToken'
]);

module.exports = User;