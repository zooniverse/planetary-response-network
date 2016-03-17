var Redis = require('ioredis');
var redis = new Redis();
var pub = new Redis();

var tasks = {
  fetching_mosaics:    {status: 'done', label: 'Fetching mosaics'},
  tilizing_mosaics:    {status: 'done', label: 'Tilizing mosaic images'},
  generating_manifest: {status: 'error', label: 'Generating subject manifest'},
  uploading_images:    {status: 'in-progress', label: 'Uploading images'},
  deploying_subjects:  {status: null, label: 'Deploying subjects'},
  finished:            {status: null, label: 'Build completed successfully'}
}

setInterval(function(){
  console.log(tasks);
  pub.publish('build status', JSON.stringify(tasks));
}, 5000)
