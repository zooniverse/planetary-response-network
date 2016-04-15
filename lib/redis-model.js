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

    find(id, done) {
      redis.hgetall(this.getRedisId(id), (err, data) => {
        if (err) {
          done(err)
        } else if (!data.id) {
          done(new Error('No '+this.name+' with id ' + id + ' found'));
        } else {
          done(null, new RedisModelInstance(this, data));
        }
      });
    }

    findOrCreate(id, done) {
      this.find(id, (err, instance) => {
        if (err) {
          instance = this.create({ id: id })
        }
        done(null, instance);
      });
    }

    save(instance, done) {
      redis.hmset(this.getRedisId(instance.data[this.idField]), instance.data, (err, reply) => {
        if (err) return done(err);
        done(null, instance);
      });
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
      return this;
    }

    save(done) {
      this.model.save(this, done);
      return this;
    }

    update(data, done) {
      this.set(data).save(done);
    }

    toJson() {
      return this.data;
    }
  }

  return RedisModel;
}