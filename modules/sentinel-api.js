var Client = require('node-rest-client').Client;

var auth = { user: process.env.SCIHUB_USER, password: process.env.SCIHUB_PASS };
var client = new Client(auth);

exports.searchTilesByAOI = searchTilesByAOI;

searchTilesByAOI();

function searchTilesByAOI(bounds) {
  console.log('Searching tiles by AOI...');

  var cloudcoverpercentage = 50;
  var url = 'https://scihub.copernicus.eu/dhus/search?q=beginPosition:[NOW-12MONTHS%20TO%20NOW]%20AND%20endPosition:[NOW-12MONTHS%20TO%20NOW]%20AND%20platformname:%20%22Sentinel-2%22%20AND%20cloudcoverpercentage:[0%20TO%2050]%20AND%20footprint:%22Intersects(POLYGON((85.31790371515265%2027.74112247549664,%2085.29471858829717%2027.72571509606928,%2085.29413862454905%2027.6938172811564,%2085.31838875561394%2027.67944111681705,%2085.34663714286582%2027.67782735898242,%2085.36838931902295%2027.68205287088499,%2085.37743011085362%2027.70303837353786,%2085.37132696978759%2027.72918006286135,%2085.3473677598608%2027.74063311882999,%2085.31790371515265%2027.74112247549664)))%22&format=json';
  var parameters = {
    format: 'json'
  }
  var headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  var args = {
    headers: headers
  }

  var req = client.get(url, args, function(data, response) {
    var totalEntries = data.feed['opensearch:totalResults'];
    console.log('Number of entries found: %d', totalEntries);
    if( totalEntries == 1 ) { // API returns object with single entry
      processEntry(data.feed.entry);
    } else if ( totalEntries > 1 ) { // API returns array of entries
      for(entry of data.feed.entry) {
        processEntry(entry);
      }
    }
  });

  req.on('error', function(err) {
    console.log('Uh-oh!: %s', err);
  })

}

function processEntry(entry) {
  console.log('Processing entry:, %s', entry.title);
}
