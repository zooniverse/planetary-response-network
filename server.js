const processAoi = require('./middleware/process-aoi')
const express    = require('express')
const morgan     = require('morgan')
const multer     = require('multer')
const yargs      = require('yargs')
const path       = require('path')
const http       = require('http')

// Parse options
const argv = yargs
  .describe('use-queue', 'Send subject-creation tasks to a Redis queue instead of directly spawning them')
  .default('use-queue', true)
  .argv

const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

io.sockets.on('connection', function(socket){
  console.log('Socket connected: %s', socket.id )
})

const upload = multer({ dest: path.join(__dirname, './uploaded_aois') })

app.use(morgan('combined'))

// Handle AOI uploads
app.post('/aois', upload.single('file'), processAoi.runner({
  useQueue: argv.useQueue
}))

app.get('/build/status', processAoi.getStatus())

const port = process.env.PORT || 3736
server.listen(port, function(error){
  if (error) {
    console.log(error);
    return;
  }
  console.log('Server listening on port:', port);
})
