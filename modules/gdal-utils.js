// Note: This module requires QGIS to be installed on the local machine as it uses the command line
'use strict';
const spawn = require('child_process').spawn;

function merge(params, callback) {
  // build comandline parameter array
  let paramsArray = [];
  for(let key in params) {
    let value = params[key];
    switch(key) {
      case 'verbose':
        if(value) paramsArray.push('-v');
        break;
      case 'noDataValue':
        paramsArray.push('-n');
        paramsArray.push(value);
        break;
      case 'outputNoDataValue':
        paramsArray.push('-a_nodata');
        paramsArray.push(value);
        break;
      case 'separate':
        if(value) paramsArray.push('-separate');
        break;
      case 'outputFormat':
        paramsArray.push('-of');
        paramsArray.push(value);
        break;
      case 'infiles':
        for(let file of value) {
          paramsArray.push(file);
        }
        break;
      case 'outfile':
        paramsArray.push('-o');
        paramsArray.push(value);
        break;
      default:
        callback('gdalUtil.merge: unrecognized option');
    }
  }
  run('gdal_merge.py', paramsArray, function(err, code){
    console.log('gdal_merge finished with code %s', code);
    callback(err, params.outfile);
  });
}

function translate(params, callback) {
  // build comandline parameter array
  let paramsArray = [];
  for(let key in params) {
    let value = params[key];
    switch(key) {
      case 'outputType':
        paramsArray.push('-ot');
        paramsArray.push(value);
        break;
      case 'scale':
        paramsArray.push('-scale');
        for(let scaleVal of value) {
          paramsArray.push(scaleVal);
        }
        break;
      case 'infile':
        paramsArray.push(value);
        break;
      case 'outfile':
        paramsArray.push(value);
        break;
      default:
        callback('gdalUtil.translate: unrecognized option');
    }
  }
  run('gdal_translate', paramsArray, function(err, code){
    console.log('gdal_translate finished with code %s', code);
    callback(err, params.outfile);
  });
}

function run(command, paramsArray, callback) {
  console.log('run()', paramsArray);
  const spawnProcess = spawn(command, paramsArray);

  spawnProcess.stdout.on('data', (data) => {
    process.stdout.write( data.toString() );
  });

  spawnProcess.stderr.on('data', (data) => {
    callback( data.toString() );
  });

  spawnProcess.on('close', (code) => {
    if(code !== 0) callback(code);
    else callback(null, code);
  });

}

module.exports = {merge, translate}
