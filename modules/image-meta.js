var ChildProcess = require('child_process');
// var exiv2 = require('exiv2')

function writeImgMeta( filename, data, callback ){
  var data = { "Exif.Photo.UserComment": JSON.stringify(data) }

  exiv2.setImageTags(filename, data, function(error){
    if (error) {
      console.error(error);
    } else {
      console.log('  ' + filename + ': Saved reference coordinates to tile metadata.');
      callback(null, filename)
    }
  });
}

function readImgMeta( filename, callback ){
  // exiv2.getImageTags(filename, callback);

  console.log('Running...');
  filename = 'data/L15-1509E-1187N_after_0_9.png'

  ChildProcess.exec('exiftool -userComment ' + filename, function(error, stdout, stderr){
      if(error){
        console.log(error);
      } else{
        console.log(stdout);
      }
  })
}

module.exports = {
  read: readImgMeta,
  write: writeImgMeta
}
