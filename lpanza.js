var io;
var gameSocket;

// Constants
var debugMode = true;
var serverMaxUsersCount = 20;
var serverTickDelay = 50;
var maxUserNameLength = 20;
var backgroundColor = [144, 238, 144];

var tanksHP = 10;
var damagePerShot = 1;

var showAreaWidth = 500;
var showAreaHeight = 300;

var mapWidth = 1000;
var mapHeight = 1000;

var distanceFromWall = 30;

var tankWidth = 50;
var tankLength = 50;
var tankTurretRadius = 9;
var tankGunWidth = 3;
var tankGunLength = 20;
var tankSpeed = 5;

var scoreForKill = 10;
var scoreForHit = 1;

var maxWidthLength = tankWidth;

var tankReloadTime = 2000;

var ratingShowUsersCount = 5;

var bulletDistanceFromGun = 1;
var bulletWidth = 2;
var bulletLength = 8;
var bulletSpeed = 15;

var turretLength = 25;
var turretWidth = 25;

var checkColisionAreaWidth = 100;
var checkColisionAreaHeight = 100;
//
var models = {
        'tank': {
            'КВ-1': {
                size: {
                    width: tankWidth,		
                    length: tankLength
                },		
                center: {
                    x: 0,		
                    y: 0
                },		
                turretCenter: {
                    x: 0,		
                    y: 0
                }
            }
        },		
        'turret': {
            'КВ-1': {
                size: {
                    width: 25,		
                    length: 50
                },		
                center: {
                    x: 0,		
                    y: -12.5
                }
            }
    },
    'bullet' : {
        'КВ-1': {
            size: {
                width: bulletWidth,		
                length: bulletLength
            },		
            center: {
                x: 0,		
                y: 0
            }
        }
    }

    
};
var tanks = [ ];
var bullets = [ ]
var userIdNames = { };
var userIdScores = { };
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
    if (user.userName.length > maxUserNameLength) {
        sock.emit('game.join.fail', { reason : 'error.join_fail_text.name_too_long' });
        if (debugMode)
            console.log(user.userName + ' не смог подключиться');
        return false;
    }
	if(userNames.length >= serverMaxUsersCount){
		sock.emit('game.join.fail', { reason : 'error.join_fail_text.max_user_count_exceeded'});
		if(debugMode)
			console.log(user.userName + ' не смог подключиться');
		return false;
	}
	
	gameSocket.on('game.control', gameControl);
    gameSocket.on('disconnect', userLeave);
    gameSocket.on('game.ping', userPing);
    
	userIdNames[userId] = user.userName;
	userNames.push(user.userName);
    userIdScores[userId] = 0;
	//Инициализация танка
	var label = {};
	label.hp = tanksHP;
	label.userName = user.userName;
    label.userId = userId;

	var tank = { };
	tank.rotation = getRandom(0,7) * 45;
    tank.type = 'tank';
    tank.subtype = Object.keys(models.tank)[0];
    tank.size = models.tank[tank.subtype].size;
    var gun = {};
    gun.timeToReload = 0;

    var turret = {};
	turret.rotation = tank.rotation;
	turret.radius = tankTurretRadius;
    turret.gun = gun;
	
    tank.position = getRandomPosition();
	tank.speed = 0;
	tank.turret = turret;
	tank.label = label;
    tank.moveVector = point_(0, 0);

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
        },
        models :  models 
    });
	if(debugMode)
        console.log(user.userName + ' подключился к серверу');
    updateOnline();
    updateRating();
}

function updateRating(){
    if (io !== undefined && userNames.length > 0) {
        var rating = [];
        var keys = Object.keys(userIdScores);
        
        for (var i = 0; i < keys.length; i++) {
            rating.push({ userName : userIdNames[keys[i]], score : userIdScores[keys[i]] });
        }
        rating.sort(ratingCmp);
        rating = rating.slice(0, ratingShowUsersCount);
        io.emit('game.rating', { users : rating });
    }
}

function ratingCmp(a, b){
    return a.score == b.score ? 0 : a.score > b.score ? -1 : 1;
}

function userPing(data){
    var sock = this;
    sock.emit('game.ping', data);
}

function updateOnline(){
    io.emit('game.online', { users : userNames });
}

function userLeave(){
    var socket = this;
	var userId = getUserId(socket.id);
    deleteUser(userId);
    updateOnline();
    updateRating();
}

function deleteUser(userId){
    if (userIdNames.hasOwnProperty(userId)) {
        var uname = userIdNames[userId];
        if (debugMode)
            console.log(uname + ' покинул сервер');
        removeFromArray(userNames, uname);
        delete (userIdNames[userId]);
        delete (tanks[userId]);
        delete (clients[userId]);
        delete (userIdScores[userId]);
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
        sock.emit('game.test', { tanks : Object.values(tanks), bullets : bullets, userNames : userNames, userIdNames : userIdNames });
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
    bullet.size = models.bullet[tank.subtype].size;
    var shotPos = tank.center;
    shotPos = geom.addToPos(shotPos, geom.turnVector(models.tank[tank.subtype].turretCenter, tank.rotation), 1);
    shotPos = geom.addToPos(shotPos, geom.moveVector(bullet.rotation, models.turret[tank.subtype].size.length - models.turret[tank.subtype].center.y));
   
    var vector = shotPos;
    bullet.color = getRandomColor();
    bullet.position = point_(vector.x + tank.position.x, vector.y + tank.position.y);
    bullet.type = 'bullet';
    bullet.speed = bulletSpeed;
    bullet.moveVector = geom.moveVector(bullet.rotation, bullet.speed);
    bullet.owner = tank.label.userId;

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
            repaintGroups[id] = [];

            for (var j = 0; j < group.length; j++) {
                var curObject = objects[group[j]];
                if (moved[group[j]] !== 'moved') {
                    var newPos = geom.addToPos(curObject.position, curObject.moveVector, 1);
                    if (curObject.type === 'tank') {
                        curObject.position.x = 
                        (newPos.x < curObject.size.width / 2) ? 
                            curObject.size.width / 2 : 
                            (newPos.x > mapWidth - curObject.size.width / 2) ? 
                                mapWidth - curObject.size.width / 2 : 
                                newPos.x;

                        curObject.position.y = 
                        (newPos.y < curObject.size.length / 2) ?
                            curObject.size.length / 2 :
                            (newPos.y > mapHeight - curObject.size.length / 2) ?
                             mapHeight - curObject.size.length / 2 : 
                             newPos.y;

						for (var h = 0; h < group.length; h++) {
							var cur = objects[group[h]];
							if (cur.type === 'tank') {
								var collision = geom.TDA_rectanglesIntersect(
									cur,
									curObject
								);
								if(collision.collide) {
									pushTanksAway(
										cur,
										curObject,
										collision.rotation,
										collision.distance
									);
								}
							}
						}
                    }
                    if (curObject.type === 'bullet') {
                        curObject.position = newPos;
                        for (var h = 0; h < group.length; h++) {
                            var cur = objects[group[h]];
							if (cur.type === 'tank') {
								var collision = geom.TDA_rectanglesIntersect(
									cur,
									curObject
								);
								if(collision.collide) {
									bulletOnTankHit(cur, curObject);
								}
                            }
                        }
                    }
                    objects[group[j]] = curObject;
                    moved[group[j]] = 'moved';
                } 
                if (curObject.type === 'bullet') {
                    repaintGroups[id].push(curObject);
                }
                if (curObject.type === 'tank') {
                    curObject.label.score = userIdScores[curObject.label.userId];
                    repaintGroups[id].push(curObject);
                }
            }
        }
        var clientsIds = Object.keys(io.engine.clients);
        for (var i = 0; i < clientsIds.length; i++) {
            var uid = getUserId(clientsIds[i]);
            if (repaintGroups[uid] !== undefined) {
                if(clients.hasOwnProperty(uid))
                    clients[uid].emit('game.paint', { objects : repaintGroups[uid] });
            }
        }
    }
    console.timeEnd('serverTick');
}
function pushTanksAway (tank1, tank2, rotation, distance) {
	var v = geom.moveVector(rotation, distance/2);
	tank1.position = geom.addToPos(tank1.position, v, 1);
	tank2.position = geom.addToPos(tank2.position, v, -1);
}

/**
 * При попадании пули в танк
 * */

function bulletOnTankHit(tank, bullet){
    tank.label.hp -= damagePerShot;
    userIdScores[bullet.owner] += scoreForHit;
    if (tank.label.hp == 0){
        tank.type = 'deleted-tank';
        clients[tank.label.userId].emit('game.over', { score : userIdScores[tank.label.userId] });
        userIdScores[bullet.owner] += scoreForKill;
        deleteUser(tank.label.userId);
    }
    updateRating();
    bullet.type = 'deleted-bullet';
    removeFromArray(bullets, bullet);
}

function getPaintData(object){
    var paintData = {
        size : object.size,
        center : object.position,
        file : object.type + '.' + object.subtype + '.texture.png'
    };
    if (object.type === 'tank') {
        paintData.turretCenter = geom.addToPos(object.turret.position, object.position, -1);
    }
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