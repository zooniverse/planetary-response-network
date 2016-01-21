var tilizeImage = require('./modules/tilize-image')
var filename     = process.argv[2]

tilizeImage(filename, 480, 160, function () {
  // Done
});
