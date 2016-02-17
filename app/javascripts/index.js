Uploader = require('./uploader')

new Uploader(document.querySelector('.uploader'), {
  target: '/aois',
  acceptedTypes: ['application/vnd.google-earth.kml+xml']
})
