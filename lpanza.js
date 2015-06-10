var io;
var gameSocket;

// Constants
var debugMode = true;
var serverMaxUsersCount = 100;
var serverTickDelay = 50;

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

var bulletDistanceFromGun = 5;
var bulletWidth = 2;
var bulletLength = 8;
var bulletSpeed = 3;

var checkColisionAreaWidth = 200;
var checkColisionAreaHeight = 200;
//
var tanks = [ ];
var bullets = [ ]
var userIdNames = { };

var userNames = [ ];

var timer;
exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
	
	var userId = getUserId(socket.id);
	
    gameSocket.on('game.join', userJoin);
    gameSocket.on('game.test', gameTest);
}

exports.startServer = function (){
    timer = setInterval(serverTick, serverTickDelay);
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
	
	gameSocket.on('game.control', gameControl);
    gameSocket.on('disconnect', userLeave);
	userIdNames[userId] = user.userName;
	userNames.push(user.userName);
	
	//Инициализация танка
	var label = {};
	label.hp = tanksHP;
	label.userName = user.userName;
	
	var tank = { };
	tank.rotation = getRandom(0,360);
	
    var gun = {};
    gun.size = { width : tankGunWidth, length : tankGunLength };
	gun.color = getRandomColor();
	
	var turret = { };
	turret.rotation = tank.rotation;
	turret.radius = tankTurretRadius;
	turret.gun = gun;
	
	turret.gun.distance = turret.radius;
	
	tank.position = getRandomPosition();
	tank.color = getRandomColor();
    tank.size = { width : tankWidth, length : tankLength };
	tank.speed = 0;
	tank.turret = turret;
	tank.label = label;
	
	tanks[userId] = tank;
	if(debugMode){
		console.log('userIdNames: ', userIdNames);
		console.log('userNames: ', userNames);
		console.log('tanks: ', tanks);
        console.log('bullets: ', bullets);
	}
	sock.emit('game.join.ok',{ paintRect: { width : showAreaWidth, height : showAreaHeight } });
	if(debugMode)
			console.log(user.userName + ' подключился к серверу');
}
function userLeave(){
    var socket = this;
	var userId = getUserId(socket.id);
	
	if(userIdNames.hasOwnProperty(userId)){
		var uname = userIdNames[userId];
		if(debugMode)
            console.log(uname + ' покинул сервер');
        removeFromArray(userNames, uname);
        delete (userIdNames[userId]);
        delete (tanks[userId]);
		
	}
}

function gameControl(control){
    var sock = this;
	var userId = getUserId(sock.id);
    if (!userIdNames.hasOwnProperty(userId)) {
        console.log('Попытка получить данные от юзера которого нет');
        return false;
    }
    var tank = tanks[userId];
	
	if(control.type === 'shot')
        doShot(tank);
	
	if(control.type === 'rotate')
        tank.turret.rotation = control.rotation;

    if (control.type === 'accelerate') {
        tank.rotation = control.rotation;
        tank.speed = control.power * tankSpeed;
    }
	
}

function gameTest(){
    if (debugMode) {
        sock.emit('game.test', { tanks : tanks, bullets : bullets, userNames : userNames, userIdNames : userIdNames });
    }
}

/**
 * Стреляем танком
 * */
function doShot(tank){
	var bullet = {};
    bullet.rotation = tank.turret.rotation;
    bullet.size = { length : bulletLength, width : bulletWidth };
    var angle = (Math.PI / 180) * bullet.rotation;
    var distFromTurretCenter = tank.turret.distance + tank.turret.gun.length + bulletDistanceFromGun + (bullet.length / 2);
    var y = Math.sin(angle) * distFromTurretCenter;
    var x = Math.cos(angle) * distFromTurretCenter;
    bullet.color = getRandomColor();
    bullet.position = { x : x + tank.position.x, y : y + tank.position.y };
    
    bullets.push(bullet);
}

function serverTick(){
    if (userNames.length > 0) {
        var objects = tanks.concat(bullets);
        objects.sort(positionComparator);
        var groups = getGroups(objects, checkColisionAreaWidth, checkColisionAreaHeight);
    }
}


// HelperFunctions

function getGroups(array, width, height){
    var groups = [];
}

function positionComparator(a, b) {
    if (a.position.y == b.position.y) {
        if (a.position.x == b.position.x)
            return 0;
        return a.position.x < b.position.x ? -1 : 1;
    }
    return a.position.y < b.position.y ? -1 : 1;

}
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
function removeFromArray(array, val) {
    for (var i = array.length - 1; i >= 0; i--) {
        if (array[i] === val) {
            array.splice(i, 1);
            return false;
        }
    }
}
//