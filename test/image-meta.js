'use strict';
const fs = require('fs');
const expect = require('chai').expect;
const imageMeta = require('../modules/image-meta');

const testImg = __dirname+'/data/exif.jpg';

describe('image-meta', () => {

  describe('readMeta', () => {
    it('should read tags from an image', (done) => {
      imageMeta.read(testImg, ['-ImageSize', '-Comment'], (err, meta) => {
        expect(meta).to.deep.equal({
          'imageSize': '64x64',
          'comment': 'Created with GIMP'
        });
        done();
      });
    });
  });

  describe('readMeta', () => {
    it('should write a tag to an image', (done) => {
      const imgOrig = fs.readFileSync(testImg);
      imageMeta.write(testImg, '-UserComment', { someKey: 'someValue' }, (err, meta) => {
        imageMeta.read(testImg, ['-UserComment'], (err, meta) => {
          expect(JSON.parse(decodeURIComponent(meta.userComment))).to.deep.equal({
            someKey: 'someValue'
          });

          // Restore original content
          fs.writeFileSync(testImg, imgOrig);
          done();
        });
      });
    });
  });

});