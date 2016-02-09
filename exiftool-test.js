var imgMeta      = require('./modules/image-meta');
var fs           = require('fs');
var ChildProcess = require('child_process');

// var imgMeta = require('./modules/image-meta.js')

var filename = 'data/L15-1509E-1187N_before_0_0.jpeg'

// imgMeta.read(filename)

var tags = ['-userComment']

imgMeta.read(filename, tags, function (error, metadata) {
  if (error)
    throw error
  else
    console.log('SUCCESS!')
    console.log('Metadata: ', JSON.parse( decodeURIComponent( metadata['userComment'] ) ) )
});

// var content = {"upper_left":{"foo_lon":85.25390555555556,"lat":27.574002387152778},"upper_right":{"foo_lon":85.27450483940973,"foo_lat":27.574002387152778},"bottom_right":{"foo_lon":85.27450483940973,"foo_lat":27.55574815538194},"bottom_left":{"foo_lon":85.25390555555556,"foo_lat":27.55574815538194},"center":{"foo_lon":85.26420519748264,"foo_lat":27.56487527126736}}
// imgMeta.write(filename, tag, content, function (error, metadata) {
//   if (error)
//     throw error
//   else
//     console.log(metadata)
// });


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
