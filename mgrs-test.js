// mgrs = require('mgrs')
// var coords = {lat: 27.699984, lon:85.359030}
// console.log('Coordinates: ', coords)
// console.log('MGRS: ', mgrs.forward([coords.lon, coords.lat]) )
//

// mgrs = require('mgrs')
// var mgrs_string = '45RUL100000100000'
// // var mgrs_string = '45RUL'
// // var mgrs_string = '4QFJ15'
//
// console.log('MGRS STRING: ', mgrs_string)
// console.log('BOUNDING BOX: ', mgrs.toPoint(mgrs_string) )


//
// var gdal = require("gdal");
// var dataset = gdal.open("B02.tif");
//  console.log('dataset: ', dataset);

// var tilizeImage  = require('./modules/tilize-image.js')
//
// tilizeImage('color_normalized.tif', 480, 160, function(){
//   if(error) {
//     console.log(error);
//   } else {
//     console.log('COMPLETE!');
//   }
// })


// var wgs84 = require('wgs84-util')
// console.log('LAT/LON = ', wgs84.UTMtoLL({northing: 300000, easting: 3100020, zoneNumber: 45, zoneLetter: 'R'}) );

var utmObj = require('utm-latlng');
var utm=new utmObj('WGS 84');
var coords = utm.convertUtmToLatLng(300000.0, 2990220.0 , 45, 'R')
console.log('COORDINATES: ', coords.lat, coords.lng )
