var morgan     = require('morgan');
var path       = require('path');
var express    = require('express');
var webpack    = require('webpack');
var config     = require('./webpack.config');

var processAoi = require('./middleware/process-aoi')
var multer     = require('multer')
var fork       = require('child_process').fork

var app = express();
var compiler = webpack(config);
var upload = multer({ dest: path.join(__dirname, './uploaded_aois') })


app.use(morgan('combined'));

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}));


/* Serve-up static assets */
app.use(express.static(__dirname + '/public'))

app.get('/css/bootstrap.min.css', function (req, res) {
  res.sendFile(path.join(__dirname, 'build/css/bootstrap.min.css'));
});

/* Default to index page */
app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build/index.html'));
});

/* Handle AOI uploads */
app.post('/aois', upload.single('file'), processAoi)

// /* Test subject generation locally */
// app.post('/aois', upload.single('file'), function (req, res, next) {
//   res.send('Upload complete, starting subject fetch job')
//   // Start job, ensuring correct working directory
//   var script = 'planet-api-before-after-test'
//   var job = fork(script, [req.file.path])
// })

app.listen(3736, function (err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('Server listening on port: 3736');
});
