'use strict';
const Rsmq  = require('rsmq')
const async = require('async')

const QUEUE_NAME = 'zooniverse_prn'
const rsmq = new Rsmq({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  ns: 'rsmq'
})
rsmq.createQueue({ qname: QUEUE_NAME }, function (err, resp) {
  if (resp === 1) {
    console.log("queue created")
  }
})


module.exports = {
  push: function (message, repeat, interval, callback) {
    var tasks = []
    for (var i = 0; i < repeat; i++) {
      let job = {
        qname: QUEUE_NAME,
        message: JSON.stringify(message),
        delay: i * interval
      }
      tasks.push(async.apply(rsmq.sendMessage, job))
    }
    async.series(tasks, callback)
  }
}
