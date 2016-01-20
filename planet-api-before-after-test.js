var jsdom     = require('jsdom').jsdom
var tj        = require('togeojson')
var fs        = require('fs')
var glob      = require('glob')
var planetAPI = require('./modules/planet-api.js')

// var url = "https://api.planet.com/v0/scenes/ortho/"
// var url = "https://api.planet.com/v0/mosaics/nepal_landsat_prequake_mosaic/quads/"
// var url = "https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/"
// var url = "https://api.planet.com/v0/mosaics/nepal_3mo_pre_eq_mag_6_mosaic/quads/"
// var url = "https://api.planet.com/v0/mosaics/nepal_interquake_mosaic/quads/"

var before_url = 'https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/'
var after_url  = 'https://api.planet.com/v0/mosaics/nepal_3mo_pre_eq_mag_6_mosaic/quads/'

var key = process.env.PLANET_API_KEY

var kml = jsdom(fs.readFileSync('data/central-kathmandu.kml'));
var geoJSON = tj.kml(kml)
var bounds = geoJSON.features[0].geometry.coordinates[0]

/* Call Planet API and download GeoTIF and accompanying JSON files */
planetAPI.fetchMosaicFromAOI( bounds, before_url, 'foo', key)


// planetAPI.fetchBeforeAndAfterMosaicFromAOI( before_url, after_url, bounds, key)

// /* Process each GeoTIF file that was dowloaded */
//
// glob("data/*.tif", function (er, files) {
//   for(var i=0; i<files.length; i++){
//     console.log('FILE = ', files[i]);
//
//   }
//   // files is an array of filenames.
//   // If the `nonull` option is set, and nothing
//   // was found, then files is ["**/*.js"]
//   // er is an error object or null.
// })
