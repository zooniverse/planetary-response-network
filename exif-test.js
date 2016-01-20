var exiv2 = require('exiv2')

var data = {foo: "bar"}
var filename = 'data/L15-1509E-1187N_before_0_0.png'

// writeImgMeta(filename,data)
readImgMeta(filename)

function writeImgMeta( filename, data ){
  var data = { "Exif.Photo.UserComment": JSON.stringify(data) }

  exiv2.setImageTags(filename, data, function(error){
    if (error) {
      console.error(error);
    } else {
      console.log("setImageTags complete..");
    }
  });
}

function readImgMeta( filename ){
  exiv2.getImageTags(filename, function(error, tags) {
    if (error) {
      console.error(error);
    } else{
      try{
        console.log('TAGS: ', tags); // debug
        return JSON.parse(tags["Exif.Photo.UserComment"])
      }
      catch(error){
        console.error('Invalid JSON: '+error);
      }
    }
  });
}
