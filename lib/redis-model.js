'use strict';

module.exports = (redis) => {
  if (!redis) throw new Error('No redis instance passed to model');

  class RedisModel {
    /**
     * @classdesc Redis-backed object model
     * @param {String}   name
     * @param {Array<String>}  fields
     * @param {Object}   options
     * @param {String}   options.idField
     */
    constructor(name, fields, options) {
      this.name = name;
      this.fields = fields || [];
      this.idField = options ? options.idField || 'id' : 'id';
    }

    create(data) {
      if (!data[this.idField]) throw new Error('No id specified for new model');
      return new RedisModelInstance(this, data);
    }

    get(id, done) {
      redis.hgetall(this.getRedisId(id), (err, data) => {
        done(err, new RedisModelInstance(this, data));
      });
    }

    save(instance, done) {
      redis.hmset(this.getRedisId(instance.data[this.idField]), instance.data, done);
    }

    getRedisId(id) {
      return this.name+':'+id;
    }
  }

  class RedisModelInstance {
    /**
     * @classdesc Redis-backed object instance
     * @param {RedisModel}     model
     * @param {Object}   data
     */
    constructor(model, data) {
      this.model = model;
      this.data = {};
      for (var k in data) {
        if (k === model.idField || model.fields.indexOf(k) > -1) {
            this.data[k] = data[k];
        }
      }
    }

    get(key) {
      return this.data[key];
    }

    set(keyOrData, val) {
      if (typeof keyOrData === 'string') {
        this.data[keyOrData] = val;
      } else {
        for (var k in keyOrData) {
          if (this.model.fields.indexOf(k) > -1) {
            this.data[k] = keyOrData[k];
          }
        }
      }
    }

    save(done) {
      this.model.save(this, done);
    }

    toJson() {
      return this.data;
    }
  }

  return RedisModel;
}