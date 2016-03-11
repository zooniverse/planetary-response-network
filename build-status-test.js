async = require('async')

const delay = 5000

// DEBUG CODE
async.forever(
  function(next){
    async.series([
        function(callback){
            setTimeout( function(){
              process.send({status: 'fetching_mosaics'})
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout( function(){
              process.send({status: 'tilizing_mosaics'})
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout( function(){
              process.send({status: 'generating_manifest'})
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout( function(){
              process.send({status: 'uploading_images'})
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout( function(){
              process.send({status: 'deploying_subjects'})
              callback(null, 'one')
            }, delay)
        },
        function(callback){
            setTimeout(function(){
              process.send({status: 'finished'})
              callback(null, 'two')
              next()
            }, 10000)
        }
    ])
  }
)
