var io;
var gameSocket;

// Constants
var debugMode = true;
var serverMaxUsersCount = 100;

var tanksHP = 10;
var damagePerShot = 1;

var showAreaWidth = 700;
var showAreaHeight = 400;

var mapWidth = 3000;
var mapHeight = 3000;

var distanceFromWall = 30;

var tankWidth = 40;
var tankLength = 40;
var tankTurretRadius = 12;
var tankGunWidth = 4;
var tankGunLength = 25;
var tankSpeed = 1;
//
var tanks = [ ];
var bullets = [ ]
var userIdNames = { };

var userNames = [ ];
var userPressedKeys = [  ]

exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
	
	var userId = getUserId(socket.id);
	
	gameSocket.on('game.join', userJoin);
	
	sio.on('disconnect', userLeave);
	
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

function userJoin(user) {
	var sock = this;
	var userId = getUserId(sock.id);
	
	
	if(userNames.length >= serverMaxUsersCount){
		sock.emit('game.join.fail', { reason : 'Достигнут лимит игроков. Подождите пока сервер освободится'});
		if(debugMode)
			console.log(user.userName + ' не смог подключиться');
		return false;
	}
	
	gameSocket.on('game.input', gameInput);
	
	userIdNames[userId] = user.userName;
	userNames.push(user.userName);
	userPressedKeys[userId] = [];
	
	//Инициализация танка
	var label = {};
	label.hp = tanksHP;
	label.userName = user.userName;
	
	var tank = { };
	tank.rotation = getRandom(0,360);
	
	var gun = { };
	gun.width = tankGunWidth;
	gun.length = tankGunLength;
	gun.color = getRandomColor();
	
	var turret = { };
	turret.rotation = tank.rotation;
	turret.radius = tankTurretRadius;
	turret.gun = gun;
	
	turret.gun.distance = turret.radius;
	
	tank.position = getRandomPosition();
	tank.color = getRandomColor();
	tank.width = tankWidth;
	tank.length = tankLength;
	tank.speed = 0;
	tank.turret = turret;
	tank.label = label;
	
	tanks[userId] = tank;
	if(debugMode){
		console.log('userIdNames: ', userIdNames);
		console.log('userNames: ', userNames);
		console.log('tanks: ', tanks);
        console.log('userPressedKeys: ', userPressedKeys);
        
	}
	sock.emit('game.join.ok',{ paintRect: { width : showAreaWidth, height : showAreaHeight } });
	if(debugMode)
			console.log(user.userName + ' подключился к серверу');
}
function userLeave(socket){
	var userId = getUserId(socket.id);
	
	if(userIdNames.hasOwnProperty(userId)){
		var uname = userIdNames[userId];
		if(debugMode)
			console.log(uname + ' покинул сервер');
		userNames.erase(uname);
		delete(uname);
		
	}
}

function gameInput(input){
	var sock = this;
	var userId = getUserId(sock.id);
	var tank = tanks[userId];
	
	if(input.type == 'mouse.move'){
			tank.turret.rotation = input.rotation;
	}
	if(input.type == 'mouse.click'){
		tank.turret.rotation = input.rotation;
		doShot(tank);
	}
	if(input.type == 'keyboard.up'){
		userPressedKeys[userId].erase(input.key);
		if(userPressedKeys[userId].length == 0)
			tank.speed = 0;
	}
	if(input.type == 'keyboard.down'){
		userPressedKeys[userId].push(input.key);
		tank.speed = tankSpeed;
	}
}
function doShot(tank){
	var bullet = {};
	bullet.rotation = tank.turret.rotation;
}
// HelperFunctions
/**
	Пока просто рандом, потом будем выбирать по менее заселенной местности
*/

function getRandomPosition(){
	var pos = { };
	pos.x = getRandom(distanceFromWall,mapWidth - distanceFromWall);
	pos.y = getRandom(distanceFromWall,mapHeight - distanceFromWall);
	return pos;
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomColor(){
	return [ getRandom(0,255), getRandom(0,255), getRandom(0,255) ];
}

function getUserId(socketId){
	return socketId.toString().substr(0,5);
}

function getOnline(){
	var onlineList = [];
	for(var us in userIdNames)
		onlineList.push(userIdNames[us]);
	
	return onlineList;
}
//