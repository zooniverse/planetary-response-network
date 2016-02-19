const Rsmq = require('rsmq')

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
  push: function (message) {
    rsmq.sendMessage({ qname: QUEUE_NAME, message: message }, function (err, resp) {
      if (resp) {
        console.log("Message sent. ID:", resp);
      }
    });
  }
}