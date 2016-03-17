const socketio = require('socket.io')

module.exports = initSockets;

function initSockets(server){
  var io = socketio.listen(server)

  io.sockets.on('connection', function(socket){
    console.log('Socket connected: %s', socket.id )
  })

}
