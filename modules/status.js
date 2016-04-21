'use strict';
const redisRw = require('../lib/redis')
const redisPubSub = require('../lib/redis-pubsub')
const redisPub = redisPubSub.pub
const redisSub = redisPubSub.sub

class Status {

  constructor(jobId) {
    this.jobId = jobId;

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
  update(task, status, callback) {
    if( this.tasks[task] === undefined ) {
      console.log('ERROR: Could not find task \'%s\' in Status::update()', task);
    }
    console.log('[STATUS: %s] Task \'%s\' status updated to \'%s\'', this.jobId, task, status);
    this.tasks[task].status = status
    var channel = 'status:'+this.jobId;
    var wholeState = JSON.stringify(this.tasks);
    // Publish event
    redisSub.subscribe(channel, function(error, count){
      redisPub.publish(channel, wholeState);
      if (callback) callback(error);
    }.bind(this));

    // Write permanent record of event
    redisRw.set('job:'+this.jobId+':status', wholeState);
  }

}

module.exports = Status;
