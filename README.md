# generate-subjects-from-planet-api
Create Zooniverse subjects via Planet Labs API using area of interest (AOI) queries.

## Getting Started
Clone and `npm install`. You'll need a key to the Planet API and set it in the `PLANET_API_KEY` environmental variable.
There are three scripts set up to demonstrate what's currently implemented.

### Fetching Mosaics by Area of Interest (AOI)
Run `npm run-script planet-api-test` on the CLI to access the API and fetch mosaics intersecting with a polygonal AOI inscribing central Kathmandu. This should download two GeoTIF files in the `/data` directory along with corresponding JSON files containing the "Features" hash. This will be useful in the future for retrieving metadata and digging through individual scenes that make up the mosaic. It's also used as a placeholder to append the geo coordinates we'll calculate next.

### Computing Reference Coordinates
Run `npm run-script geo-coords-test` on the CLI. This will extract the coordinates of the corner and center pixels of one of the GeoTIF files (`data/L15-1509E-1188N.tif`) that were downloaded in the previous section. The resulting coordinates are appended in the `reference_coordinates` hash of its corresponding JSON file.

```
"reference_coordinates": {
	"upper_left": {
		"lat": 27.839074999999998,
		"lon": 85.25390555555556
	},
	"upper_right": {
		"lat": 27.839074999999998,
		"lon": 85.42968611111111
	},
	"bottom_right": {
		"lat": 27.68352777777778,
		"lon": 85.42968611111111
	},
	"bottom_left": {
		"lat": 27.68352777777778,
		"lon": 85.25390555555556
	},
	"center": {
		"lat": 27.761330555555556,
		"lon": 85.34179722222221
	}
}
```

### Generating Tiles
Run `npm run-script tilize-images` on the CLI. This will split one of the downloaded mosaic GeoTIFs (`data/L15-1509E-1188N.tif`) into tiles 480px square, with 160px overlap between tiles and write a subject set file (`data/manifest.csv`) ready to upload to Panoptes. For customisation options, run `node tilize-images`.

TO DO: Interpolate geo coords of individual tiles and generate metadata. Creating subjects and loading into Panoptes follows.
