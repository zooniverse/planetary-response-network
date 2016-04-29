const yargs = require('yargs');
const tilize = require('./modules/tilize-image');

const argv = yargs
  .usage('$0 <options> image1 [image2...]')
  .option('size', {
    describe: 'Square size for tiles',
    default: 500
  })
  .option('overlap', {
    describe: 'Tile overlap (both x and y)',
    default: 250
  })
  .demand(1)
  .argv;

if (argv._.length === 1) {
  tilize.tilize(argv._[0], argv.size, argv.overlap);
} else {
  tilize.tilizeMany(argv._, argv.size, argv.overlap);
}