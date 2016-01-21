var exiv2 = require('exiv2')

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
  exiv2.getImageTags(filename, callback);
}

module.exports = {
  read: readImgMeta,
  write: writeImgMeta
}
