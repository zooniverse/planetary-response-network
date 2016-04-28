'use strict';
const fs = require('fs');
const sinon = require('sinon');
const expect = require('chai').expect;

const planetAPI = require('../modules/planet-api');
const tilizeImage = require('../modules/tilize-image');
const AOI = require('../modules/aoi');
const Quad = require('../modules/quad');
const Mosaic = require('../modules/mosaic');

// Stub status class
const Status = function () {};
Status.prototype.update = Function.prototype;

describe('Mosaic', () => {
  const aoi = new AOI('data/central-kathmandu.kml');
  const mosaic = new Mosaic({
    provider: 'planet-api',
    label: 'pre',
    labelPos: 'south',
    showLabel: true,
    url: 'http://example.com/mosaic_pre',
    tileSize: 480,
    tileOverlap: 160,
    status: new Status()
  });

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
      expect(mosaic).to.have.property('provider');
      expect(mosaic).to.have.property('label');
      expect(mosaic).to.have.property('showLabel');
      expect(mosaic).to.have.property('url');
      expect(mosaic).to.have.property('tileSize');
      expect(mosaic).to.have.property('tileOverlap');
      expect(mosaic).to.have.property('status');
      expect(mosaic.provider).to.equal('planet-api');
      expect(mosaic.label).to.equal('pre');
      expect(mosaic.showLabel).to.equal(true);
      expect(mosaic.url).to.equal('http://example.com/mosaic_pre');
      expect(mosaic.tileSize).to.equal(480);
      expect(mosaic.tileOverlap).to.equal(160);
      expect(mosaic.status).to.be.an.instanceOf(Status);
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

       var tilizeManyStub = sinon.stub(tilizeImage, 'tilizeMany', (files, tileSize, tileOverlap, label, labelPos, callback) => {
         callback(null, [
           '/path/to/some/tile',
           '/path/to/some/tile',
           '/path/to/some/tile',
           '/path/to/some/tile'
         ]);
       });

       mosaic.createTilesForAOI(aoi, (err, tiles) => {
         expect(tiles).to.be.an('Array');
         expect(tiles.length).to.equal(4);
         expect(tilizeManyStub.args[0][0]).to.deep.equal(['/path/to/some/file', '/path/to/some/file']);
         expect(tilizeManyStub.args[0][1]).to.equal(480);
         expect(tilizeManyStub.args[0][2]).to.equal(160);
         expect(tilizeManyStub.args[0][3]).to.equal('pre');
         expect(tilizeManyStub.args[0][4]).to.equal('south');
         expect(tilizeManyStub.args[0][5]).to.be.an.instanceOf(Function);
         done();
       });

    });
  })

});