'use strict'
const express     = require('express')
const multer      = require('multer')
const path        = require('path')
const fork        = require('child_process').fork
const processAoi  = require('./middleware/process-aoi')
const upload      = multer({ dest: __dirname + '/../uploaded_aois' })
const app         = express()

// Use Jade (http://jade-lang.org) for templates
app.set('view engine', 'jade')
app.set('views', __dirname + '/views')

// Serve static assets
app.use(express.static(__dirname + '/public'))

// Server upload page
app.get('/', function (req, res) {
  res.render('upload')
})

// Accept AOI uploads
app.post('/aois', upload.single('file'), processAoi)

// Start the server
app.listen(3736, function () {
  console.log('Uploader app listening on port 3736')
})
