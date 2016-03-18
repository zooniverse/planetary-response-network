'use strict';
/* adapted from
 * https://github.com/naturalatlas/node-gdal/blob/master/examples/gdalinfo.js
 */
var gdal       = require('gdal')
var util       = require('util')
var jsonFormat = require('json-format')
var fs         = require('fs')

const wgs84 = gdal.SpatialReference.fromEPSG(4326)

function pxToWgs84 (dsOrFilename, x, y) {
	const ds = (dsOrFilename.constructor.name === 'Dataset') ? dsOrFilename : gdal.open(dsOrFilename);
	var geotransform = ds.geoTransform;
	var coord_transform = new gdal.CoordinateTransformation(ds.srs, wgs84)
	var point = coord_transform.transformPoint({
		x: geotransform[0] + x * geotransform[1] + y * geotransform[2],
		y: geotransform[3] + x * geotransform[4] + y * geotransform[5]
	});
	return {
		lon: point.x,
		lat: point.y
	};
}

/* Read GeoTIF and extract metadata e.g. size, reference coordinates */
function getMetadata (dsOrFilename) {
	const ds = (dsOrFilename.constructor.name === 'Dataset') ? dsOrFilename : gdal.open(dsOrFilename);

	var driver = ds.driver;
	var driver_metadata = driver.getMetadata();
	if (driver_metadata['DCAP_RASTER'] !== 'YES') {
		console.error('Source file is not a raster')
		process.exit(1);
	}

	// raster size
	var size = ds.rasterSize;

	// corners
	var corners = {
		upper_left   : {x: 0, y: 0},
		upper_right  : {x: size.x, y: 0},
		bottom_right : {x: size.x, y: size.y},
		bottom_left  : {x: 0, y: size.y},
		center       : {x: size.x / 2, y: size.y / 2}
	};

	var coordinates = {}
	var corner_names = Object.keys(corners)
	corner_names.forEach(function(corner_name) {
		// convert pixel x,y to the coordinate system of the raster
		// then transform it to WGS84
		var corner = corners[corner_name]
		coordinates[corner_name] = pxToWgs84(ds, corner)
	});

	return { size: size, reference_coordinates: coordinates }
}

/* Append/replace image corner coordinates in JSON file */
function writeMetaToJSON (filename, metadata) {
	var file_content = fs.readFileSync(filename).toString('utf-8')
	var content = JSON.parse(file_content)
	content['metadata'] = metadata
	fs.writeFileSync(filename, jsonFormat(content));
}

module.exports = {
	pxToWgs84: pxToWgs84,
	getMetadata: getMetadata,
	writeMetaToJSON: writeMetaToJSON
}