const processAoi = require('./middleware/process-aoi')
const express    = require('express')
const morgan     = require('morgan')
const multer     = require('multer')
const yargs      = require('yargs')
const path       = require('path')
const http       = require('http')
const config     = require('./lib/config.json')

// Parse options
const argv = yargs
  .describe('use-queue', 'Send subject-creation tasks to a Redis queue instead of directly spawning them')
  .default('use-queue', true)
  .argv

const app = express()
const server = require('http').createServer(app)

const io = require('socket.io').listen(server)
io.sockets.on('connection', function(socket){
  console.log('Socket connected: %s', socket.id )
})

var Redis = require('ioredis');
var redis = new Redis({host: config.redis_server.host, port: config.redis_server.port});

redis.subscribe('build status', function(error, count){

})

redis.on('message', function (channel, message) {
  // console.log('Receive message \'%s\' from channel \'%s\'', message, channel);
  io.emit('build status', message) // emit message to socket.io clients
});

const upload = multer({ dest: path.join(__dirname, './uploaded_aois') })

app.use(morgan('combined'))

// Handle AOI uploads
app.post('/aois', upload.single('file'), processAoi.runner({useQueue: argv.useQueue} ))

const port = process.env.PORT || 3736
server.listen(port, function(error){
  if (error) {
    console.log(error);
    return;
  }
  console.log('Server listening on port:', port);
})
