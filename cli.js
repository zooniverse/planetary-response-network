const yargs = require('yargs');
const argv = yargs
  .command(require('./tilize'))
  .help()
  .argv;
