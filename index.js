// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var rooms = {};

// usernames which are currently connected to the chat
var usernames = {};

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.to(socket.roomid).emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (data) {
    // we store the username in the socket session for this client
    var username = data.username;
    var roomid = data.roomid;

    // join the room specified
    socket.join(roomid);
    console.log('user', username, 'joined', roomid);

    socket.username = username;
    socket.roomid = roomid;

    // add the client's username to the global list
    usernames[username] = username;
    if(!rooms[roomid]) {
      rooms[roomid] = 1;
    } else {
      ++rooms[roomid];
    }

    addedUser = true;
    socket.emit('login', {
      numUsers: rooms[roomid],
      username: username
    });

    // echo globally (all clients) that a person has connected
    socket.broadcast.to(socket.roomid).emit('user joined', {
      username: socket.username,
      numUsers: rooms[roomid]
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.to(socket.roomid).emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.to(socket.roomid).emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      var numUsers;      
      if(rooms[socket.roomid] - 1 == 0) {
        delete rooms[socket.roomid];
        numUsers = 0;
      } else {
        numUsers = --rooms[socket.roomid];
      }

      delete usernames[socket.username];

      // echo globally that this client has left
      socket.broadcast.to(socket.roomid).emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
