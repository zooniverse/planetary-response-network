async = require('async')
const delay = 5000

// status should be one of three values: null, in-progress, done, error
var tasks = {
    fetching_mosaics:    {status: null, label: 'Fetching mosaics'},
    tilizing_mosaics:    {status: null, label: 'Tilizing mosaic images'},
    generating_manifest: {status: null, label: 'Generating subject manifest'},
    uploading_images:    {status: null, label: 'Uploading images'},
    deploying_subjects:  {status: null, label: 'Deploying subjects'},
    finished:            {status: null, label: 'Build completed successfully'}
}

function updateStatus(task, status){
  console.log('STATUS = ', status);
  console.log('updateStatus(): tasks = ', tasks['fetching_mosaics'].status);
  tasks[task].status = status
  process.send(tasks)
}

console.log('Fetching Mosaics...');

// process.send({status: tasks})
// DEBUG CODE
async.forever(
  function(next){
    async.series([
        function(callback){
            setTimeout( function(){
              updateStatus('fetching_mosaics', 'in-progress')
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            updateStatus('fetching_mosaics', 'done')
            setTimeout( function(){
              updateStatus('tilizing_mosaics', 'in-progress')
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            updateStatus('tilizing_mosaics', 'done')
            setTimeout( function(){
              updateStatus('generating_manifest', 'in-progress')
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            updateStatus('generating_manifest', 'done')
            setTimeout( function(){
              updateStatus('uploading_images', 'in-progress')
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            updateStatus('uploading_images', 'done')
            setTimeout( function(){
              updateStatus('deploying_subjects', 'in-progress')
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout(function(){
              updateStatus('finished', 'in-progress')
              callback(null, 'two')
              next()
            }, 10000)
        }
    ])
  }
)
