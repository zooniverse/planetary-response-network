'use strict';
const redis_host = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379
};

const Redis = require('ioredis');
const pub = new Redis(redis_host);
const sub = new Redis(redis_host);

// Export singleton
module.exports = {
  pub: pub,
  sub: sub
};