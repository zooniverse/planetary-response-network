planetAPI = require('./planet-api.js')

// var url = "https://api.planet.com/v0/scenes/ortho/"
// var url = "https://api.planet.com/v0/mosaics/nepal_landsat_prequake_mosaic/quads/"
var url = "https://api.planet.com/v0/mosaics/nepal_unrestricted_mosaic/quads/"
var key = process.env.PLANET_API_KEY

// bounds obtained from Google Earth (KML), then converted to GeoJSON

// k-town, los angeles
// var bounds =
//   [ [-118.2979050488487,34.07723373596225],
//     [-118.3019228239179,34.07724912524296],
//     [-118.303088312077,34.07369093649347],
//     [-118.3026243870722,34.06901015468049],
//     [-118.2987726458948,34.06630648585389],
//     [-118.2986299885148,34.06627402021158],
//     [-118.2927296990813,34.065676168055],
//     [-118.2880885880428,34.0700444664061],
//     [-118.2887485845385,34.07427953051096],
//     [-118.295842792416,34.077663025636],
//     [-118.2979050488487,34.07723373596225] ]

// central kathmandu
var bounds =
  [ [85.31790371515265,27.74112247549664,0],
    [85.29471858829717,27.72571509606928,0],
    [85.29413862454905,27.6938172811564,0],
    [85.31838875561394,27.67944111681705,0],
    [85.34663714286582,27.67782735898242,0],
    [85.36838931902295,27.68205287088499,0],
    [85.37743011085362,27.70303837353786,0],
    [85.37132696978759,27.72918006286135,0],
    [85.3473677598608,27.74063311882999,0],
    [85.31790371515265,27.74112247549664,0] ]

/* Call Planet API and download GeoTIF and accompanying JSON files */
planetAPI.fetchMosaicFromAOI( bounds, url, key)
