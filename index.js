/*
 * Взято отсюда
 * http://frontender.info/building-multiplayer-games-with-node-js-and-socket-io/
 */
var app = require('express')();

// Создаем HTTP-сервер с помощью модуля HTTP, входящего в Node.js. 
// Связываем его с Express и отслеживаем подключения к порту 8080. 
var server = require('http').createServer(app).listen(1337);

// Инициализируем Socket.IO так, чтобы им обрабатывались подключения 
// к серверу Express/HTTP
var io = require('socket.io').listen(server);

app.get('/', function(req,res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log('user connected');
});