var spawn = require('child_process').spawn;

const spawnProcess = spawn('gdal_merge.py', [
  '-n', 0, '-a_nodata', 0, '-separate', '-of', 'GTiff',
  '-o', '/Volumes/MBONGWANA/composite.tif',
  '/Users/sascha/Documents/Zooniverse/PRN/planetary-response-network/data/tiles/45/R/UL/2016/4/13/0/B04.jp2',
  '/Users/sascha/Documents/Zooniverse/PRN/planetary-response-network/data/tiles/45/R/UL/2016/4/13/0/B03.jp2',
  '/Users/sascha/Documents/Zooniverse/PRN/planetary-response-network/data/tiles/45/R/UL/2016/4/13/0/B02.jp2'
]);

spawnProcess.stdout.on('data', (data) => {
  process.stdout.write(data.toString());
});

spawnProcess.stderr.on('data', (data) => {
  console.log('stderr: %s', data.toString());
});

spawnProcess.on('close', (code) => {
  console.log('process ended with code %s', code);
});
