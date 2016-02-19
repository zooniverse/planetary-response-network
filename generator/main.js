'use strict'
const path             = require('path')
const fork             = require('child_process').fork
const RSMQWorker       = require('rsmq-worker')

const LOG_TAG = 'prn_factory'
const GENERATOR_SCRIPT = path.join(__dirname, '../planet-api-before-after-test.js')
const QUEUE_NAME = 'zooniverse_prn'

// Scoped logging
function log () {
  let msgs = ['[' + LOG_TAG + ']']
  msgs = msgs.concat(Array.from(arguments))
  console.log.apply(this, msgs)
}

// Create worker
const worker = new RSMQWorker(QUEUE_NAME, {
  maxReceiveCount: 1,
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  timeout: 0 // Wait indefinitely for jobs to finish before grabbing another
})

// Listen for jobs
worker.on( "message", function(filename, next) {
  log('received message', filename, 'spawning', GENERATOR_SCRIPT)
  const job = fork(GENERATOR_SCRIPT, [filename])
  job.on('close', function (code) {
    log('Job for', filename, 'finished with code', code)
    next()
  })
})

// Handle errors/lifecycle
worker.on('error', function(err, msg) {
    log("ERROR", err, msg.id)
})
worker.on('exceeded', function(msg) {
    log("EXCEEDED", msg.id)
})
worker.on('timeout', function(msg) {
    log("TIMEOUT", msg.id, msg.rc)
})

// Kickoff
worker.start()
log('Listening for jobs in queue', QUEUE_NAME)
