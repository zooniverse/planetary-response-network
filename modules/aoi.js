'use strict';
const fs = require('fs');
const jsdom = require('jsdom').jsdom;
const toGeoJson = require('togeojson');

class AOI {
  constructor(file) {
    if (file) this.file = file;
  }

  set file(file) {
    this._file = file;
    this.kml = jsdom(fs.readFileSync(file));
  }

  get file() {
    return this._file;
  }

  get bounds() {
    var geoJSON = toGeoJson.kml(this.kml);
    return geoJSON.features[0].geometry.coordinates[0];
  }

}

module.exports = AOI;