'use strict';
const expect = require('chai').expect;
const AOI = require('../modules/aoi');

describe('AOI', () => {
  const aoi = new AOI('data/central-kathmandu.kml');

  describe('create', () => {
    it('should read the file in as KML', function () {
      expect(aoi).to.have.property('file');
      expect(aoi.file).to.equal('data/central-kathmandu.kml');
      expect(aoi).to.have.property('kml');
      expect(aoi.kml.readyState).to.equal('complete');
    });
  })

  describe('#bounds', () => {
    it('should extract the AOI bounds as geoJSON', function () {
      const expectedBounds = [ [ 85.31790371515265, 27.74112247549664, 0 ],
        [ 85.29471858829717, 27.72571509606928, 0 ],
        [ 85.29413862454905, 27.6938172811564, 0 ],
        [ 85.31838875561394, 27.67944111681705, 0 ],
        [ 85.34663714286582, 27.67782735898242, 0 ],
        [ 85.36838931902295, 27.68205287088499, 0 ],
        [ 85.37743011085362, 27.70303837353786, 0 ],
        [ 85.37132696978759, 27.72918006286135, 0 ],
        [ 85.3473677598608, 27.74063311882999, 0 ],
        [ 85.31790371515265, 27.74112247549664, 0 ] 
      ];
      expect(aoi.bounds).to.be.an('Array');
      expect(JSON.stringify(aoi.bounds)).to.equal(JSON.stringify(expectedBounds));
    });
  })
});