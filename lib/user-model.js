const redis = require('./redis');

const RedisModel = require('./redis-model')(redis);
var User = new RedisModel('user', [
  'username',
  'displayName',
  'accessToken',
  'accessTokenExpiresAt',
  'refreshToken'
]);

module.exports = User;