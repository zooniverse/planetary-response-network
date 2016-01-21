var exiv2 = require('exiv2')
var imgMeta = require('./modules/image-meta')

var data = {foo: "bar"}
var filename = 'data/L15-1509E-1187N_before_0_0.png'

imgMeta.write(filename,data, function () {
  imgMeta.read(filename, function (err, result) {
    console.log(result)
  })
})
