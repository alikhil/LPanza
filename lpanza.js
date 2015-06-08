var io;
var gameSocket;

var userIdNames = { };
/*
	constants
*/
var tanksHP = 10;
var damagePerShot = 1;

var mapWidth = 3000;
var mapHeight = 3000;

var distanceFromWall = 30;

var tankWidth = 40;
var tankLenght = 40;
var tankTurretRadius = 12;
var tankGunWidth = 4;
var tankGunLenght = 25;

var tanks = [ { } ];
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
	var userId = getUserId(sock.id);
	userIdNames[userId] = user.user;
	//Инициализация танка
	var label = {};
	label.hp = tankHP;
	label.userName = user.user;
	
	var gun = { };
	gun.width = tankGunWidth;
	gun.lenght = tankGunLenght;
	gun.color = getRandomColor();
	
	var turret = { };
	turret.rotation = tank.rotation;
	turret.radius = tankTurretRadius;
	turret.gun = gun;
	
	var tank = { };
	tank.position = getRandomPosition();
	tank.rotation = getRandom(0,360);
	tank.color = getRandomColor();
	tank.width = tankWidth;
	tank.lenght = tankLenght;
	
	tank.turret = turret;
	tank.label = label;
	
	tanks[userId] = tank;
}
/*
	Пока просто рандом, потом будем выбирать по менее заселенной местности
*/
function getRandomPosition(){
	var pos = { };
	pos.x = getRandom(distanceFromWall,mapWidth - distanceFromWall);
	pos.y = getRandom(distanceFromWall,mapHeight - distanceFromWall);
	return pos;
}

function getRandom(min, max){
  return Math.random() * (max - min) + min;
}

function getRandomColor(){
	return [ getRandom(0,255), getRandom(0,255), getRandom(0,255) ];
}
function getUserId(socketId){
	return socketId.toString().substr(0,5);
}