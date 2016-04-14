const redis = require('./redis');

const RedisModel = require('./redis-model')(redis);
var User = new RedisModel('User', [
  'username',
  'displayName',
  'accessToken',
  'accessTokenExpiresAt',
  'refreshToken'
]);

module.exports = User;