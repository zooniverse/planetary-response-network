var im = require('imagemagick');
im.readMetadata('data/L15-1509E-1188N.tif', function(err, metadata){
  if (err) throw err;
  console.log('Shot at '+metadata.exif.dateTimeOriginal);
})
