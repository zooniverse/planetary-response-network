processAoi  = require('./middleware/process-aoi')
express     = require('express')
multer      = require('multer')
path        = require('path')
fork        = require('child_process').fork

upload      = multer({ dest: 'uploaded_aois' })
app         = express()

// Ensure correct working directory
process.chdir(__dirname)

// Use Jade (http://jade-lang.org) for templates
app.set('view engine', 'jade')
app.set('views', __dirname + '/views')

// Serve static assets
app.use(express.static('public'))

// Server upload page
app.get('/', function (req, res) {
  res.render('upload')
})

process.chdir('../') // return to root dir

// Accept AOI uploads
app.post('/aois', upload.single('file'), processAoi)

// Start the server
app.listen(3736, function () {
  console.log('Uploader app listening on port 3736...')
})
