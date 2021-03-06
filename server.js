const processAoi     = require('./middleware/process-aoi')
const express        = require('express')
const morgan         = require('morgan')
const multer         = require('multer')
const yargs          = require('yargs')
const path           = require('path')
const fs             = require('fs')
const https          = require('https')
const cors           = require('cors')
const auth           = require('./lib/auth')
const getJobs        = require('./middleware/get-jobs')
const deleteJob      = require('./middleware/delete-job')
const panoptesProxy  = require('./middleware/panoptes-proxy')
const config         = require('./config.js')

// Parse options
const argv = yargs
  .describe('use-queue', 'Send subject-creation tasks to a Redis queue instead of directly spawning them')
  .default('use-queue', true)
  .argv

https.globalAgent.options.rejectUnauthorized = false;

var key = fs.readFileSync('server.key')
var cert = fs.readFileSync('server.crt')

var credentials = {
    key: key,
    cert: cert
};

const app = express()

// Enable CORS - TODO restrict to trusted origin URLs
app.use(cors({
  origin: config.client, //'https://localhost:3443',
  credentials: true
}))

// const server = require('http').createServer(app)
const server = require('https').createServer(credentials,app)

const io = require('socket.io').listen(server)

io.sockets.on('connection', function(socket){
  console.log('Socket connected: %s', socket.id )
})

const redis_host = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379
}

const Redis = require('ioredis');
const redis = new Redis(redis_host);

redis.psubscribe('status:*', function(error, count){})
redis.on('pmessage', function (channel, pattern, message) {
  console.log('Received message from channel \'%s\'', pattern);
  io.emit(pattern, message) // emit message to socket.io clients
});

const upload = multer({ dest: path.join(__dirname, './uploaded_aois') })
app.use(morgan('combined'))

// Setup auth
auth.setupMiddlewares(app);

// Handle AOI uploads
app.post('/aois', auth.ensureLogin, upload.single('file'), processAoi.runner({useQueue: argv.useQueue} ))

// Job routes
app.get('/jobs', auth.ensureLogin, getJobs)
app.delete('/jobs/:job_id', auth.ensureLogin, deleteJob)

// Proxy panoptes calls
app.get('/projects', auth.ensureLogin, panoptesProxy.getProjects)
app.get('/subject-sets', auth.ensureLogin, panoptesProxy.getSubjectSets)

const port = process.env.PORT || 3736
server.listen(port, function(error){
  if (error) {
    console.log(error);
    return;
  }
  console.log('Server listening on port:', port);
})
