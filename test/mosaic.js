'use strict';
const fs = require('fs');
const sinon = require('sinon');
const expect = require('chai').expect;

const planetAPI = require('../modules/planet-api');
const tilizeImage = require('../modules/tilize-image');
const AOI = require('../modules/aoi');
const Quad = require('../modules/quad');
const Mosaic = require('../modules/mosaic');

describe('Mosaic', () => {
  const aoi = new AOI('data/central-kathmandu.kml');
  const mosaic = new Mosaic('planet-api', 'pre', 'http://example.com/mosaic_pre', 480, 160);

  // Stub api functions so we can test with no network dependency
  sinon.stub(planetAPI, 'fetchQuadsFromAOI', (aoi, label, url, callback) => {
    fs.readFile(__dirname+'/data/quads.json', (err, data) => {
      callback(null, JSON.parse(data.toString('utf-8')));
    });
  });
  sinon.stub(planetAPI, 'downloadFile', (options, callback) => {
    process.nextTick(callback, null, '/path/to/some/file');
  });

  describe('create', () => {
    it('should set internal properties', function () {
      expect(mosaic).to.have.property('label');
      expect(mosaic.label).to.equal('pre');
      expect(mosaic).to.have.property('url');
      expect(mosaic.url).to.equal('http://example.com/mosaic_pre');
    });
  });

  describe('#fetchQuadsForAOI', () => {
    it ('should call the API with bounds, url and label', (done) => {

      mosaic.fetchQuadsForAOI(aoi, (err, quads) => {
        expect(quads).to.be.an('Array');
        for (var quad of quads) {
          expect(quad).to.be.an.instanceof(Quad);
        }

        done();
      });
    });
  });

  describe('#fetchFilesForAOI', () => {
    it ('should tell its quads to download their files', (done) => {

      var quadFetchSpy = sinon.spy(mosaic, 'fetchQuadsForAOI');
      var quadDownloadSpy = sinon.spy(Quad.prototype, 'download');

      mosaic.fetchFilesForAOI(aoi, (err, files) => {
        expect(quadFetchSpy.callCount).to.equal(1);
        expect(quadDownloadSpy.callCount).to.equal(2);
        expect(files).to.be.an('Array');
        for (var file of files) {
          expect(file).to.be.a('String');
        }

        done();
      });
    });
  });

  describe('#createTilesForAOI', () => {
    it('should create tile tasks for each quad image', (done) => {

       var tilizeStub = sinon.stub(tilizeImage, 'tilize', (file, w, h, callback) => {
         callback(null, [
           '/path/to/some/tile',
           '/path/to/some/tile'
         ]);
       });

       mosaic.createTilesForAOI(aoi, (err, tiles) => {
         expect(tiles).to.be.an('Array');
         expect(tiles.length).to.equal(4);
         expect(tilizeStub.alwaysCalledWith('/path/to/some/file', 480, 160)).to.be.true;
         done();
       });

    });
  })

});