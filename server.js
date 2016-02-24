const processAoi = require('./middleware/process-aoi')
const express    = require('express');
const morgan     = require('morgan');
const multer     = require('multer');
const yargs      = require('yargs');
const path       = require('path');

// Parse options
const argv = yargs
  .describe('use-queue', 'Send subject-creation tasks to a Redis queue instead of directly spawning them')
  .default('use-queue', true)
  .argv;

const app = express();
const upload = multer({ dest: path.join(__dirname, './uploaded_aois') })

app.use(morgan('combined'));

// Handle AOI uploads
app.post('/aois', upload.single('file'), processAoi({
  useQueue: argv.useQueue
}));

const port = process.env.PORT || 3736;
app.listen(port, function (err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('Server listening on port:', port);
});
