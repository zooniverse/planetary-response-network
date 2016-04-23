'use strict';
const async = require('async');
const imgMeta = require('./image-meta');

/**
 * Generates a subject from a set of files
 * @param  {Array<String>}  fileSet
 * @param  {Function}       callback
 */
function subjectFromTiles(tiles, callback) {
  imgMeta.read(tiles[0], ['-userComment'], (err, metadata) => {
    if (err) return callback(err);
    try {
      var subject = {
        metadata: JSON.parse(decodeURIComponent(metadata["userComment"]))
      };
      subject.locations = tiles.map(tile => {
        return { 'image/jpeg': tile }
      });
      callback(null, subject);
    } catch (e) {
      callback(e);
    }
  });
}
/**
 * Generates subjects from a list of tile sets (a tile set being tiles generated from a single source file)
 * @param  {Array<<Array<String>>}  tileSets
 * @param  {Function}               callback
 */
function subjectsFromTileSets(tileSets, callback) {
  // Pivot the tiles to be grouped by subject instead of source file
  var subjectTileSets = [];
  for (var i = 0; i < tileSets[0].length; i++) {
    let subjectTileSet = [];
    for (var tileSet of tileSets) {
      subjectTileSet.push(tileSet[i]);
    }
    subjectTileSets.push(subjectTileSet);

    i++;
  }
  // Create subjects from new tile sets
  async.map(subjectTileSets, subjectFromTiles, callback);
}

module.exports = { subjectFromTiles, subjectsFromTileSets }
