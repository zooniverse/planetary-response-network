var jsdom = require('jsdom').jsdom
var tj    = require('togeojson')
var fs    = require('fs')
planetAPI = require('./modules/planet-api.js')

// var url = "https://api.planet.com/v0/scenes/ortho/"
// var url = "https://api.planet.com/v0/mosaics/nepal_landsat_prequake_mosaic/quads/"
// var url = "https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/"

// before
var url = "https://api.planet.com/v0/mosaics/nepal_3mo_pre_eq_mag_6_mosaic/quads/"

// // after
// var url = "https://api.planet.com/v0/mosaics/nepal_interquake_mosaic/quads/"

var key = process.env.PLANET_API_KEY

var kml = jsdom(fs.readFileSync('data/central-kathmandu.kml'));
var geoJSON = tj.kml(kml)
var bounds = geoJSON.features[0].geometry.coordinates[0]

/* Call Planet API and download GeoTIF and accompanying JSON files */
planetAPI.fetchMosaicFromAOI( bounds, url, 'foo', key)
