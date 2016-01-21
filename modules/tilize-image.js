/**
 * Splits an image into tiles
 * @param  {String}   filename input image
 * @param  {Number}   tileSize Square size for the resultant tiles (in pixels)
 * @param  {Number}   overlap  Amount by which to overlap tiles in x and y (in pixels)
 * @param  {Function} callback
 */
module.exports = function (filename, tileSize, overlap, callback){
  var tile_wid = tileSize;
  var tile_hei = tileSize;
  var step_x = tile_wid - overlap;
  var step_y = tile_hei - overlap;

  var basename = path.basename(filename).split('.')[0]
  var dirname  = path.dirname(filename)
  var metadata = geoCoords.getMetadata(filename)

  var json_filename = dirname + '/' + basename + '.json'
  geoCoords.writeMetaToJSON( json_filename, metadata ) // write metadata for coordinate interpolations

  var content = JSON.parse( fs.readFileSync( dirname + '/' + basename + '.json' ) )
  var size = content.metadata.size
  var reference_coordinates = content.metadata.reference_coordinates

  var task_list = []

  for( var offset_x=0, row=0; offset_x<=size.x; offset_x+=step_x, row++) {
    for( var offset_y=0, col=0; offset_y<=size.y; offset_y+=step_y, col++) {

      // crop current tile
      var outfilename = dirname + '/' + basename + '_' + row + '_' + col + '.png'
      var crop_option = tile_wid + 'x' + tile_hei + '+' + offset_x + '+' + offset_y
      var extent_option = tile_wid + 'x' + tile_hei

      /* Convert corner and center pixel coordinates to geo */
      var coords = {
        upper_left   : pxToGeo( offset_x,                offset_y,                size.x, size.y, reference_coordinates),
        upper_right  : pxToGeo( offset_x + tile_wid,     offset_y,                size.x, size.y, reference_coordinates),
        bottom_right : pxToGeo( offset_x + tile_wid,     offset_y + tile_hei,     size.x, size.y, reference_coordinates),
        bottom_left  : pxToGeo( offset_x,                offset_y + tile_hei,     size.x, size.y, reference_coordinates),
        center       : pxToGeo( offset_x + tile_wid / 2, offset_y + tile_hei / 2, size.x, size.y, reference_coordinates) // NOT (lower_right.lat - upper_left.lat, lower_right.lon - upper_left.lon) because meridians and parallels
      }

      /* Build up list of tasks */
      task_list.push(
        async.apply( im.convert, [ filename + '[0]', '-crop', crop_option, '-background', 'black', '-extent', extent_option, '-gravity', 'center', '-compose', 'Copy', '+repage', outfilename ] ),
        async.apply( writeImgMeta, outfilename, coords )  // write coordinates to tile image metadata
      )
    }
  }

  /* Run through task list */
  async.series(task_list, function (error, result) {
      // result now equals 'done'
      console.log('Finished tilizing batch.');
      callback(error, result)
  });

}
