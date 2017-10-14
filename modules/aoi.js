'use strict';
const fs = require('fs');
const toGeoJson = require('togeojson');
const DOMParser = require('xmldom').DOMParser;

class AOI {
  constructor(file) {
    if (file) this.file = file;
  }

  set file(file) {
    this._file = file;
    this.kml = new DOMParser().parseFromString(fs.readFileSync(file, 'utf8'));
  }

  get file() {
    return this._file;
  }

  get bounds() {
    var geoJSON = toGeoJson.kml(this.kml);
    // console.log(geoJSON);
    // console.log(geoJSON.features[0].geometry.coordinates[0]);
    return geoJSON.features[0].geometry.coordinates[0];
  }

}

module.exports = AOI;
