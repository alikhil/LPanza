var io;
var gameSocket;

// Constants
var debugMode = true;
var serverMaxUsersCount = 10;
var serverTickDelay = 50;

var backgroundColor = [144, 238, 144];

var tanksHP = 10;
var damagePerShot = 1;

var showAreaWidth = 400;
var showAreaHeight = 300;

var mapWidth = 1000;
var mapHeight = 1000;

var distanceFromWall = 30;

var tankWidth = 30;
var tankLength = 30;
var tankTurretRadius = 9;
var tankGunWidth = 3;
var tankGunLength = 20;
var tankSpeed = 5;

var maxWidthLength = tankWidth;

var tankReloadTime = 2000;

var bulletDistanceFromGun = 1;
var bulletWidth = 2;
var bulletLength = 8;
var bulletSpeed = 15;

var checkColisionAreaWidth = 100;
var checkColisionAreaHeight = 100;
//
var tanks = [ ];
var bullets = [ ]
var userIdNames = { };

var userNames = [ ];

var timer;
var test = 0;

var clients = {};

var _und = require('./underscore-min');
var groups = require('./group.js');
var geom = require('./geom.js');
groups.init(mapWidth, mapHeight);

exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
    console.log(test);
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
    clients[userId] = sock;
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
    label.userId = userId;

	var tank = { };
	tank.rotation = getRandom(0,360);
    tank.type = 'tank';
    var gun = {};
    gun.size = size_(tankGunWidth, tankGunLength);
	gun.color = getRandomColor();
    gun.timeToReload = 0;

	var turret = { };
	turret.rotation = tank.rotation;
	turret.radius = tankTurretRadius;
	turret.gun = gun;
	turret.color = getRandomColor();
	
	turret.gun.distanceMarginFromTurretCenter = turret.radius;
	
	tank.position = getRandomPosition();
	tank.color = getRandomColor();
    tank.size = size_(tankWidth, tankLength);
	tank.speed = 0;
	tank.turret = turret;
	tank.label = label;
    tank.moveVector = { x : 0, y : 0 };
	tanks[userId] = tank;
	if(debugMode){
		console.log('userIdNames: ', userIdNames);
		console.log('userNames: ', userNames);
		console.log('tanks: ', tanks);
        console.log('bullets: ', bullets);
	}
	sock.emit('game.join.ok', {
		paintRect : {
			width : showAreaWidth,
			height : showAreaHeight
		},
		backgroundColor : backgroundColor,
		mapSize : {
			width : mapWidth,
			height : mapHeight
		}
	});
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
        delete (clients[userId]);
		
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
        tank.moveVector = geom.moveVector(tank.rotation, tank.speed);
    }
	
}

function gameTest () {
	var sock = this;
	if (debugMode) {
		sock.emit('game.test', { tanks : tanks, bullets : bullets, userNames : userNames, userIdNames : userIdNames });
	}
}

/**
 * Стреляем танком
 * */
function doShot(tank){
    var bullet = {};
    if (tank.turret.gun.timeToReload > 0) {
        return false;
    }
    bullet.rotation = tank.turret.rotation;
    bullet.size = size_(bulletWidth, bulletLength) ;
    var distFromTurretCenter = 
		tank.turret.gun.distanceMarginFromTurretCenter + 
		tank.turret.gun.size.length + 
		bulletDistanceFromGun + 
		(bullet.size.length / 2);
   
    var vector = geom.moveVector(bullet.rotation, distFromTurretCenter);
    bullet.color = getRandomColor();
    bullet.position = point_(vector.x + tank.position.x, vector.y + tank.position.y);
    bullet.type = 'bullet';
    bullet.speed = bulletSpeed;
    bullet.moveVector = geom.moveVector(bullet.rotation, bullet.speed);
    bullets.push(bullet);
    tank.turret.gun.timeToReload = 1;

    var leftTime = tankReloadTime;

    var updateTankReload = setInterval(
        function () {
            tank.turret.gun.timeToReload = leftTime / tankReloadTime;
            leftTime -= 50;
            if (leftTime < 0) {
                clearTimeout(updateTankReload);
            }
        }, 50);
}


Object.values = function (obj) {
    var vals = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            vals.push(obj[key]);
        }
    }
    return vals;
}
//пока не буду отслеживать колизии танков и снарядов
function serverTick(){
    console.time('serverTick');
    if (userNames.length > 0) {
        for (var i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i].position.x > mapWidth || 
                bullets[i].position.y > mapHeight || 
                bullets[i].position.x < 0 ||
                bullets[i].position.y < 0) {
                bullets.splice(i, 1);
            }
        }
        var objects = Object.values(tanks).concat(bullets);

        var objectGroups = groups.getGroups(objects, showAreaWidth + maxWidthLength, showAreaHeight + maxWidthLength);
        var repaintGroups = [];
        var moved = Array(objects.length);

        for (var i = 0; i < objects.length; i++) {
            var group = objectGroups[i];
            var groupNewPos = [];
            var id = 0;
            if (objects[i].type == 'tank') {
                id = objects[i].label.userId;
            }
            repaintGroups[id] = { bullets : [], tanks : [] };

            for (var j = 0; j < group.length; j++) {
                var curObject = objects[group[j]];
                if (moved[group[j]] !== 'moved') {
                    var newPos = geom.addToPos(curObject.position, curObject.moveVector, 1);
                    if (curObject.type === 'tank') {
                        if (newPos.x >= curObject.size.width / 2 && newPos.x <= mapWidth - curObject.size.width )
                            curObject.position.x = newPos.x;
                        else {
                           // curObject.position.x = 
                        }
                        if (newPos.y >= curObject.size.length / 2 && newPos.y <= mapHeight - curObject.size.length)
                            curObject.position.y = newPos.y;

                    }
                    if (curObject.type === 'bullet') {
                        curObject.position = newPos;
                        for (var h = 0; h < group.length; h++) {
                            var cur = objects[group[h]];
                            if (cur.type === 'tank' && 
                                geom.rectanglesIntersect(
                                    geom.getRect(cur.position, cur.size, cur.rotation),
                                    geom.getRect(curObject.position, curObject.size, curObject.rotation)
                            )) {
                                bulletOnTankHit(cur, curObject);
                            }
                        }
                    }
                    objects[group[j]] = curObject;
                    moved[group[j]] = 'moved';
                } 
                if (curObject.type === 'bullet') {
                    repaintGroups[id].bullets.push(curObject);
                }
                if (curObject.type === 'tank') {
                    repaintGroups[id].tanks.push(curObject);
                }
            }
        }
        var clientsIds = Object.keys(io.engine.clients);
        for (var i = 0; i < clientsIds.length; i++) {
            var uid = getUserId(clientsIds[i]);
            if (repaintGroups[uid] !== undefined) {
                clients[uid].emit('game.paint', repaintGroups[uid]);
            }
        }
    }
    console.timeEnd('serverTick');
}

/**
 * При попадании пули в танк
 * */

function bulletOnTankHit(tank, bullet){
    if (tank.label.hp > 1) {
        tank.label.hp -= damagePerShot;
    }
    bullet.type = 'deleted-bullet';
    removeFromArray(bullets, bullet);
}

// HelperFunctions
/**Создаем объект точку*/
function point_(x, y){
    return { x : x, y : y };
}
/**Создаем объект size*/
function size_(width, length){
    return { width : width, length : length };
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


function removeFromArray(array, val) {
    for (var i = array.length - 1; i >= 0; i--) {
        if (array[i] === val) {
            array.splice(i, 1);
            return false;
        }
    }
}
//