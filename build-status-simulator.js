var Redis = require('ioredis');
var redis = new Redis();
var pub = new Redis();
async = require('async')

const delay = 5000

// status should be one of four values: null, 'in-progress', 'done', or 'error'
var tasks = {
    fetching_mosaics:    {status: null, label: 'Fetching mosaics'},
    tilizing_mosaics:    {status: null, label: 'Tilizing mosaic images'},
    generating_manifest: {status: null, label: 'Generating subject manifest'},
    uploading_images:    {status: null, label: 'Uploading images'},
    deploying_subjects:  {status: null, label: 'Deploying subjects'},
    finished:            {status: null, label: 'Build completed successfully'}
}

function updateStatus(task, status){
  console.log('[BUILD STATUS] Task \'%s\' status updated to \'%s\'', task, status);
  tasks[task].status = status
  pub.publish('build status', JSON.stringify(tasks));
}

async.forever(
  function(next){
    async.series([
        function(callback){
            // (re-)initialize task statuses
            for(var task of Object.keys(tasks)){
              tasks[task].status = null
            }
            setTimeout( function(){
              updateStatus('fetching_mosaics', 'in-progress')
              callback(null, 'one')
            }, delay)
        }.bind(this),
        function(callback){
            setTimeout( function(){
              updateStatus('fetching_mosaics', 'done')
              updateStatus('tilizing_mosaics', 'in-progress')
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout( function(){
              updateStatus('tilizing_mosaics', 'done')
              updateStatus('generating_manifest', 'in-progress')
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout( function(){
              updateStatus('generating_manifest', 'done')
              updateStatus('uploading_images', 'in-progress')
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout( function(){
              updateStatus('uploading_images', 'done')
              updateStatus('deploying_subjects', 'in-progress')
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout(function(){
              updateStatus('deploying_subjects', 'done')
              updateStatus('finished', 'in-progress')
              callback(null, 'two')
              next()
            }, 10000)
        }
    ])
  }
)
