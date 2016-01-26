var AWS = require('aws-sdk');
var fs = require('fs')

module.exports = function (src, dest, bucket, callback){
  // console.log('Uploading file to s3://', bucket);

  AWS.config.update({ // This assumes you have AWS credentials exported in ENV
    accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
    secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY
  })

  var s3 = new AWS.S3();
  var bucket   = bucket //'planetary-response-network'
  var filename = src    //'data/L15-1509E-1187N_before_9_10.png'
  var file_buffer = fs.readFileSync(filename);

  s3.putObject({
    ACL: 'public-read',
    Bucket: bucket,
    Key: dest,
    Body: file_buffer,
    ContentType: 'image/png' // Note: Otherwise file not served as image
  }, function(error, response) {
    if (error){
      callback(error)
    } else {
      // console.log('File ' + dest + ' upload complete.');
      callback(null, dest)
    }
  });
}
