'use strict';
var async = require('async');

class SentinelMGRSTile {
  constructor(path) {
    this.path = path;
    this.images = ['img1', 'img2', 'img3'];
    for(let i in this.images ) {
      this.images[i] = this.path + '/' + this.images[i];
    }
  }

  doSomething(callback) {
    console.log('doSomething(): Doing something to ', this);
    callback(null, this.images);
  }

}

let mgrsTiles = ['45RUL', '45RTL'];
let gridSquares = mgrsTiles.map( (mgrsPosition, i) => {
  return new SentinelMGRSTile('./data/' + mgrsPosition);
});


// console.log('gridSquares = ', gridSquares);


async.mapSeries(gridSquares, doSomethingWrapper, function(err, result) {
  console.log('FINISHED with result ', result);
});


function doSomethingWrapper(item, callback) {
  item.doSomething(callback);
  // callback(null, item.images);
}
