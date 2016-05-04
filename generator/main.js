'use strict'
const path             = require('path')
const fork             = require('child_process').fork
const async            = require('async')
const RSMQWorker       = require('rsmq-worker')

const LOG_TAG = 'prn_factory'
// const GENERATOR_SCRIPT = path.join(__dirname, '../build-status-simulator.js') // DEBUG CODE --STI
const GENERATOR_SCRIPT = path.join(__dirname, '../generate-subjects.js')
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

// Runs subject gen task
function generateSubjects (task, done) {
  const job = fork(GENERATOR_SCRIPT, [
    '--job-id', task.msgid,
    '--mosaics',
      // TO DO: these probably shouldn't be hard-coded
      // 'https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/',
      // 'https://api.planet.com/v0/mosaics/nepal_3mo_pre_eq_mag_6_mosaic/quads/',
      // 'https://api.planet.com/v0/mosaics/open_california_re_20131201_20140228/quads/',
      // 'https://api.planet.com/v0/mosaics/open_california_re_20141201_20150228/quads/',
      'https://api.planet.com/v0/mosaics/color_balance_mosaic/quads/',
    '--project', task.project_id,
    '--subject-set', task.subject_set_id,
    '--user-id', task.user_id,
    '--aoi', task.aoi_file
  ])

  job.on('close', function (code) {
    done(null, code)
  })
}

// Create execution queue
const execQueue = async.queue(generateSubjects, 1)

// Listen for jobs
worker.on( "message", function(payload, next, msgid) {
  payload = JSON.parse(payload)
  payload.msgid = msgid

  execQueue.push(payload, (err, code) => {
    log('Job', msgid, 'for', payload, 'finished with code', code)
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
