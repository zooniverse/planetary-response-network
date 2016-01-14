var fs         = require('fs')
var im         = require('imagemagick')
var jsonFormat = require('json-format')
var util       = require('util')

var tile_wid = 640;
var tile_hei = 640;
// var overlap  = 160; // overlap by pixels

var filename = process.argv[2]
if (!filename) {
	console.error('Filename must be provided')
	process.exit(1)
}

var basename = filename.split('/').reverse()[0].split('.')[0] // strip everything from filename (including extension)
var content = JSON.parse( fs.readFileSync( 'data/' + basename + '.json' ) )
var size = content.metadata.size

for( var offset_x=0, row=0; offset_x<=size.x; offset_x+=tile_wid, row++) {
  for( var offset_y=0, col=0; offset_y<=size.y; offset_y+=tile_hei, col++) {

    // crop current tile
    var outfilename = 'data/' + basename + '_' + row + '_' + col + '.png'
    var crop_option = '640x640+' + offset_x + '+' + offset_y
    im.convert( [ filename + '[0]', '-crop', crop_option, outfilename ],
    function (err, stdout) {
      if (err) throw err;
      console.log('Done!');
    });

    // // for debugging
    // console.log('    (ROW,COL) = ', row, ',', col );

  }
}
