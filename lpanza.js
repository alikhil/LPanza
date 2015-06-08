var io;
var gameSocket;

var userIdNames = { };

var tanksHP = 10;
var damagePerShot = 1;

exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
	
	var userId = socket.id.toString().substr(0,5);
	
	gameSocket.on('user.register', userRegister);
	
	/*
    gameSocket.emit('connected', { message: "You are connected!" });

    // Host Events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostRoomFull', hostPrepareGame);
    gameSocket.on('hostCountdownFinished', hostStartGame);
    gameSocket.on('hostNextRound', hostNextRound);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerAnswer', playerAnswer);
    gameSocket.on('playerRestart', playerRestart);
	*/
}

function userRegister(user) {
	var sock = this;
	userIdNames[sock.id.toString().substr(0,5)] = user.user;
}