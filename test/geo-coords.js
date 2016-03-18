'use strict';
const expect = require('chai').expect;
const gdal = require('gdal');
const geoCoords = require('../modules/geo-coords');

describe('geo-coords', () => {

  describe('pxToWgs84', () => {
    it('should calculate the WGS84 coordinates for an arbitrary pixel in an image', (done) => {
      const ds = gdal.open(__dirname+'/data/GeogToWGS84GeoKey5.tif');
      var latLon = geoCoords.pxToWgs84(ds, 50, 50);
      // Match to 4dp @todo find out why GDAL is slightly off. Not a massive issue - 4dp is apparently good to around ±11m (http://gis.stackexchange.com/a/8674)
      latLon.lon = Math.round(latLon.lon * 10000) / 10000;
      latLon.lat = Math.round(latLon.lat * 10000) / 10000;
      // Discard elevation
      delete latLon.z;

      expect(latLon).to.deep.equal({
        lon: 9,
        lat: 52
      });
      done();
    });
  });

});