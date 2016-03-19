'use strict';
const fs = require('fs');
const jsdom = require('jsdom').jsdom;
const toGeoJson = require('togeojson');

class AOI {
  constructor(file) {
    this.file = file;
    this.kml = jsdom(fs.readFileSync(file));
  }

  get bounds() {
    var geoJSON = toGeoJson.kml(this.kml);
    return geoJSON.features[0].geometry.coordinates[0];
  }
    
}

module.exports = AOI;