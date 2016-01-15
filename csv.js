var stringify = require('csv-stringify');

input = [ [ '1', '2', '3', '4' ], [ 'a', 'b', 'c', 'd' ] ];

input = {
  blah: 1,
  x: 2
}
stringify(input, function(err, output){
  console.log(output);
  // output.should.eql('1,2,3,4\na,b,c,d');
});
