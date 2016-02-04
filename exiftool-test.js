var exif = require('./modules/exiftool');
var fs   = require('fs');
var ChildProcess = require('child_process');

// var imgMeta = require('./modules/image-meta.js')

var filename = 'data/L15-1509E-1187N_after_0_9.png'

// imgMeta.read(filename)


exif.metadata(filename, ['-userComment', '-gamma'], function (error, metadata) {
  if (error)
    throw error
  else
    console.log(metadata)
});

// fs.readFile(filename, function (error, data) {
//   if (error)
//     throw error;
//   else {
//     exif.metadata(filename, ['-userComment', '-gamma'], function (error, metadata) {
//     // exif.metadata(data, ['-userComment', '-gamma'], function (error, metadata) {
//       if (error)
//         throw error
//       else
//         console.log(metadata)
//     });
//   }
// });
