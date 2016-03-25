'use strict';
const Redis = require('ioredis');
const redisRw = require('../lib/redis') // need this separate client for the keystore because the client created by Status is pubsub only

class Status {

  constructor(jobId, redisHost) {
    this.jobId = jobId;
    this.redisHost = redisHost;
    this.redis = new Redis(this.redisHost);
    this.pub = new Redis(this.redisHost);

    console.log('PUB = ', this.pub);

    // status should be one of four values: null, 'in-progress', 'done', or 'error'
    this.tasks = {
        fetching_mosaics:    {status: null, label: 'Fetching mosaics'},
        tilizing_mosaics:    {status: null, label: 'Tilizing mosaic images'},
        generating_manifest: {status: null, label: 'Generating subject manifest'},
        uploading_images:    {status: null, label: 'Uploading images'},
        deploying_subjects:  {status: null, label: 'Deploying subjects'},
        finished:            {status: null, label: 'Build completed successfully'}
    };
  }

  /**
   * Updates status of a task
   * @param {String}  task
   * @param {String}  status
   */
  update(task, status) {
    if( this.tasks[task] === undefined ) {
      console.log('ERROR: Could not find task \'%s\' in Status::update()', task);
    }
    console.log('[STATUS: %s] Task \'%s\' status updated to \'%s\'', this.jobId, task, status);
    this.tasks[task].status = status
    var channel = 'status:'+this.jobId;
    var wholeState = JSON.stringify(this.tasks);
    // Publish event
    this.redis.subscribe(channel, function(error, count){
      this.pub.publish(channel, wholeState);
    }.bind(this));

    // Write permanent record of event
    redisRw.set('job:'+this.jobId+':status', wholeState);
  }

}

module.exports = Status;
