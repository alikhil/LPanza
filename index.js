/*
 * ����� ������
 * http://frontender.info/building-multiplayer-games-with-node-js-and-socket-io/
 */
var app = require('express')();

// ������� HTTP-������ � ������� ������ HTTP, ��������� � Node.js. 
// ��������� ��� � Express � ����������� ����������� � ����� 8080. 
var server = require('http').createServer(app).listen(1337);

// �������������� Socket.IO ���, ����� �� �������������� ����������� 
// � ������� Express/HTTP
var io = require('socket.io').listen(server);

app.get('/', function(req,res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log('user connected');
});