/*
 * Взято отсюда
 * http://frontender.info/building-multiplayer-games-with-node-js-and-socket-io/
 */
var app = require('express')();
var express = require('express');
var port = 1337;

var server = require('http').createServer(app).listen(port);

var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req,res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log('user connected');
});