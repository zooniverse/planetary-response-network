/* modified version of http://github.com/nathanpeck/exiftool */
var ChildProcess = require('child_process');

function writeImgMeta(filename, tag, content, callback){
  ChildProcess.exec('exiftool -overwrite_original ' + tag + '=' + encodeURIComponent(JSON.stringify(content)) + ' ' + filename, function(error,stdout,stderr){
    if(error){
      console.log(error);
    } else{
      // console.log(stdout);
      callback(null, filename)
    }
  });
}

// Accepts the raw binary content of a file and returns the meta data of the file.
function readImgMeta (filename, tags, callback) {
  // tags is an optional parameter, hence it may be a callback instead.
  if (typeof tags == 'function') {
    callback = tags;
    tags = [];
  }

  ChildProcess.exec('exiftool ' + tags.join(' ') + ' ' + filename, function(error,stdout,stderr){
    if(error){
      console.log(error);
    } else{
      response = stdout
      // Split the response into lines.
      response = response.split("\n");

      //For each line of the response extract the meta data into a nice associative array
      var metaData = [];
      response.forEach(function (responseLine) {
        var pieces = responseLine.split(": ");
        //Is this a line with a meta data pair on it?
        if (pieces.length == 2)
        {
          //Turn the plain text data key into a camel case key.
          var key = pieces[0].trim().split(' ').map(
            function (tokenInKey, tokenNumber) {
              if (tokenNumber === 0)
                return tokenInKey.toLowerCase();
              else
                return tokenInKey[0].toUpperCase() + tokenInKey.slice(1);
            }
          ).join('');
          //Trim the value associated with the key to make it nice.
          var value = pieces[1].trim();
          if (!isNaN(value))
          {
            value = parseFloat(value, 10);
          }
          metaData[key] = value;
        }
      });
      callback(null, metaData);
    }
  })
}

module.exports = {
  read: readImgMeta,
  write: writeImgMeta
}
