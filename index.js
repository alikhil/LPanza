
var express = require('express');
var app = express();

var lpanza = require('./lpanza');
//var feedback = require('./feedback');

var port = 1337;

var server = require('http').createServer(app).listen(port);

var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/public'));

lpanza.startServer();

io.on('connection', function(socket){
	lpanza.initGame(io, socket);
	//feedback.init(socket);
});



console.log('listening on *:' + port);
