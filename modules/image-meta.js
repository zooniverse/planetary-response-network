/* modified version of http://github.com/nathanpeck/exiftool */

var ChildProcess = require('child_process');

function writeImgMeta(filename, tag, content, callback){
  console.log('WRITING METADATA...')
  console.log('TAG: ', tag)
  console.log('CONTENT: ', JSON.stringify(content)  )

  console.log('RUNNING COMMAND: ');
  console.log('exiftool ' + tag + '=' + encodeURIComponent(JSON.stringify(content)) + ' ' + filename);

  ChildProcess.exec('exiftool ' + tag + '=' + encodeURIComponent(JSON.stringify(content)) + ' ' + filename, function(error,stdout,stderr){
    if(error){
      console.log(error);
    } else{
      console.log('METADATA WRITTEN!');
      console.log(stdout);
      callback(null, filename)
    }
  });
}

// Accepts the raw binary content of a file and returns the meta data of the file.
function readImgMeta (filename, tags, callback) {
  console.log('READING METADATA...');
  // tags is an optional parameter, hence it may be a callback instead.
  if (typeof tags == 'function') {
    callback = tags;
    tags = [];
  }

  // The dash specifies to read data from stdin.
  // var args = (tags === [] ? ['-'] : tags.push("-"));

  console.log('TAGS = ', tags.join(' ') );


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
      console.log('META-DATA IS: ', metaData);
      callback(null, metaData);
    }
  })


  // return
  //
  // //Check for error because of the child process not being found / launched.
  // exif.on('error', function (err) {
  //   callback('Fatal Error: Unable to load exiftool. ' + err);
  // });
  //
  // // Read the binary data back
  // var response = '';
  // var errorMessage = '';
  // exif.stdout.on("data", function (data) {
  //   response += data;
  // });
  //
  // // Read an error response back and deal with it.
  // exif.stderr.on("data", function (data) {
  //   errorMessage += data.toString();
  // });
  //
  // // Handle the response to the callback to hand the metadata back.
  // exif.on("close", function () {
  //   if (errorMessage)
  //   {
  //     callback(errorMessage);
  //   }
  //   else
  //   {
  //     // Split the response into lines.
  //     response = response.split("\n");
  //
  //     //For each line of the response extract the meta data into a nice associative array
  //     var metaData = [];
  //     response.forEach(function (responseLine) {
  //       var pieces = responseLine.split(": ");
  //       //Is this a line with a meta data pair on it?
  //       if (pieces.length == 2)
  //       {
  //         //Turn the plain text data key into a camel case key.
  //         var key = pieces[0].trim().split(' ').map(
  //           function (tokenInKey, tokenNumber) {
  //             if (tokenNumber === 0)
  //               return tokenInKey.toLowerCase();
  //             else
  //               return tokenInKey[0].toUpperCase() + tokenInKey.slice(1);
  //           }
  //         ).join('');
  //         //Trim the value associated with the key to make it nice.
  //         var value = pieces[1].trim();
  //         if (!isNaN(value))
  //         {
  //           value = parseFloat(value, 10);
  //         }
  //         metaData[key] = value;
  //       }
  //     });
  //     callback(null, metaData);
  //   }
  // });
  //
  // //Give the source binary data to the process which will extract the meta data.
  // exif.stdin.write(source);
  // exif.stdin.end();
  //
  // return exif;
};


module.exports = {
  read: readImgMeta,
  write: writeImgMeta
}
