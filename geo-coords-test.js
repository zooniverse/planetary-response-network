geoCoords = require('./modules/geo-coords.js')

var filename = process.argv[2]
if (!filename) {
	console.error('Filename must be provided')
	process.exit(1)
}

var basename = filename.split('/').reverse()[0].split('.')[0] // strip everything from filename (including extension)

metadata = geoCoords.getMetadata(filename)
geoCoords.writeMetaToJSON( 'data/' + basename + '.json', metadata)
