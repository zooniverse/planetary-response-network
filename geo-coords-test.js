geoCoords = require('./modules/geo-coords.js')
path      = require('path')

var filename = process.argv[2]
if (!filename) {
	console.error('Filename must be provided')
	process.exit(1)
}

var basename = path.basename(filename).split('.')[0] // strip everything from filename (including extension)
var dirname  = path.dirname(filename)

metadata = geoCoords.getMetadata(filename)
geoCoords.writeMetaToJSON( dirname + '/' + basename + '.json', metadata)
