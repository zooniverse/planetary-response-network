var os             = require('os')
var fs             = require('fs')
var im             = require('imagemagick')
var path           = require('path')
var async          = require('async')
var imgMeta        = require('./image-meta')
var pxToGeo        = require('./px-to-geo')
var geoCoords      = require('./geo-coords')

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

  // Tile creator
  var create_tile_task = function (task, done) {
    var row = task.row
    var col = task.col
    var offset_x = task.offset_x
    var offset_y = task.offset_y

    // crop current tile
    var outfilename = dirname + '/' + basename + '_' + row + '_' + col + '.jpeg'
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

    // console.log('creating tile...', task) // DEBUG CODE
    im.convert([ filename + '[0]', '-crop', crop_option, '-background', 'black', '-extent', extent_option, '-gravity', 'center', '-compose', 'Copy', '+repage', outfilename ], function (err, stdout) {
      if (err) return done(err)
      imgMeta.write(outfilename, '-userComment', coords, done)  // write coordinates to tile image metadata
    })
  }

  // Init task queue
  var concurrency = os.cpus().length
  var queue = async.queue(create_tile_task, concurrency)

  // Completion callback
  queue.drain = function (error, result) {
    var prof2 = new Date().getTime() / 1000
    console.log('  Finished tilizing mosaic: ' + filename);
    callback(error, result)
  }

  // Push tile tasks into queue
  for( var offset_x=0, row=0; offset_x<=size.x; offset_x+=step_x, row+=1) {
    for( var offset_y=0, col=0; offset_y<=size.y; offset_y+=step_y, col+=1) {
      queue.push({
        row: row,
        col: col,
        offset_x: offset_x,
        offset_y: offset_y
      })
    }
  } // end outer for loop
}
