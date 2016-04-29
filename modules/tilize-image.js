'use strict';
var os             = require('os')
var fs             = require('fs')
var im             = require('imagemagick')
var path           = require('path')
var gdal           = require('gdal')
var async          = require('async')
var imgMeta        = require('./image-meta')
var geoCoords      = require('./geo-coords')

/**
 * Splits an image into tiles
 * @param  {String}   filename  input image
 * @param  {Number}   tileSize  Square size for the resultant tiles (in pixels)
 * @param  {Number}   overlap   Amount by which to overlap tiles in x and y (in pixels)
 * @param  {String}   label     A label to overlay on the image
 * @param  {Number}   labelPos  Where to anchor label (e.g. "south", "northwest" etc)
 * @param  {Function} callback
 */
function tilizeImage (filename, tileSize, overlap, label, labelPos, callback){
  var tile_wid = tileSize;
  var tile_hei = tileSize;
  var step_x = tile_wid - overlap;
  var step_y = tile_hei - overlap;

  var basename = path.basename(filename).split('.')[0]
  var dirname  = path.dirname(filename)
  var ds = gdal.open(filename)
  var metadata = geoCoords.getMetadata(ds)
  var size = metadata.size

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
      upper_left   : geoCoords.pxToWgs84(ds, offset_x,                offset_y),
      upper_right  : geoCoords.pxToWgs84(ds, offset_x + tile_wid,     offset_y),
      bottom_right : geoCoords.pxToWgs84(ds, offset_x + tile_wid,     offset_y + tile_hei),
      bottom_left  : geoCoords.pxToWgs84(ds, offset_x,                offset_y + tile_hei),
      center       : geoCoords.pxToWgs84(ds, offset_x + tile_wid / 2, offset_y + tile_hei / 2)
    }

    // Should we -normalize each tile?
    // PRO: Ensures contrast is stretched if images are too dark or washed out
    // CON: May take longer to process?
    let convertArgs = [
      [
        filename + '[0]',
        '-equalize',
        '-crop', crop_option,
        '-background', 'black',
        '-extent', extent_option,
        '-compose', 'Copy',
        '+repage',
        outfilename
      ]
    ];
    if (label) {
      convertArgs.push([
        outfilename,
        '-gravity', labelPos,
        '-pointsize', 14,
        '-stroke', '#000C',
        '-strokewidth', 2,
        '-annotate', 0, label,
        '-stroke', 'none',
        '-fill', 'white',
        '-annotate', 0, label,
        outfilename
      ]);
    }
    async.eachSeries(convertArgs, im.convert, (err, results) => {
      if (err) return done(err);
      imgMeta.write(outfilename, '-userComment', coords, done)  // write coordinates to tile image metadata
    });
  }

  // Init task queue
  var concurrency = os.cpus().length / 2
  var queue = async.queue(create_tile_task, concurrency)

  // Completion callback
  queue.drain = function (error) {
    console.log('  Finished tilizing mosaic: ' + filename);
    callback(error, files)
  }

  // Push tile tasks into queue
  var files = [];
  for( var offset_x=0, row=0; offset_x<=size.x; offset_x+=step_x, row+=1) {
    for( var offset_y=0, col=0; offset_y<=size.y; offset_y+=step_y, col+=1) {
      queue.push({
        row: row,
        col: col,
        offset_x: offset_x,
        offset_y: offset_y
      }, function (err, file) {
        files.push(file);
      })
    }
  } // end outer for loop
}

/**
 * Tilizes a set of images into a flat list of tiles. Assumes the source files are of the exactly same geographic bounds (i.e. same space, different time)
 * @param {Array<String>}  files           files
 * @param {Number}         tileSize        tile size
 * @param {Number}         tileOverlap     tile overlap size (x and y)
 * @param {String}         label           A label to overlay on the image
 * @param {Number}         labelPos        Where to anchor label (1 = top left, 2 = top center, 3 = top right, etc)
 * @param {Function}       callback
 */
function tilizeImages(files, tileSize, tileOverlap, label, labelPos, callback) {
  var tasks = [];
  for (var file of files) {
    tasks.push(async.apply(tilizeImage, file, tileSize, tileOverlap, label, labelPos));
  }
  async.series(tasks, (err, tilesBySrc) => {
    var allTiles = [];
    for (var tiles of tilesBySrc) {
      allTiles = allTiles.concat(tiles);
    }
    callback(err, allTiles.sort());
  });
}

module.exports = {
  tilize: tilizeImage,
  tilizeMany: tilizeImages
};
