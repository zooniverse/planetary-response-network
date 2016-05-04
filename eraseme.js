var gdal = require('gdal');
var dataset = gdal.open('./data/tiles/45/R/UL/2016/4/13/0/B02.jp2');
console.log('dataset = ', dataset);
