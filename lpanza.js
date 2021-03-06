/**
 *  Объявления 
 */
var io;
var gameSocket;

var consts = require('./constants.js');
var models = {
        'tank': {
			'and_1': {
				size: {
					width: 67.206957 * consts.texturesScale,
					length: 96.555938 * consts.texturesScale
				},
				center: {
					x: 0,
					y: 0
				},
				turretCenter: {
					x: 0,
					y: 0
				},
				hp: {
					size: {
						width: 36.730 * consts.texturesScale,
						length: 5.217 * consts.texturesScale
					},
					center: {
						x: 0,
						y: -36.743 * consts.texturesScale
					}
				}
			}
        },		
        'turret': {
			'and_1': {
				size: {
					width: 50.826 * consts.texturesScale,
					length: 84.038 * consts.texturesScale
				},
				center: {
					x: 0,
					y: -16.607 * consts.texturesScale
				},
				reload: {
					radius: 11.493 * consts.texturesScale,
					center: {
						x: 0,
						y: -16.607 * consts.texturesScale
					}
				}
			}
    },
    'bullet' : {
		'and_1': {
			size: {
				width: 5.367 * consts.texturesScale,
				length: 9.662 * consts.texturesScale
			},
			center: {
				x: 0,
				y: 0
			}
		}
    }

    
};

var userIdRooms = { };
var userIdNames = { };

var roomsData = {};

var roomsTimers = { };

var totalPlayers = 0;
var availableTotalPlayers = 0;

var roomList = { };

var curRoomId = 0;
var freeRoomIds = [];

var serverTicks = [];

var _und = require('./underscore-min');
var groups = require('./group.js');
var geom = require('./geom.js');
var util = require('./util.js');

var logger = require('intel').getLogger('logger');

var debugLive = require("debug-live");
debugLive(function (exprToEval) {
    var result;
    try {
        result = show(eval(exprToEval));
    }
    catch (ex) {
        result = ex;
    }
    return result;
}, consts.debugPort);

function show(obj){
    return JSON.stringify(obj);
}
/**
 * Выносимые функции
 */
exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
	var userId = util.getUserId(socket.id);
    updateRoomList(socket);
    gameSocket.on('game.join', userJoin);
    gameSocket.on('game.test', gameTest);
}

exports.startServer = function (){
    createRoom();
}

/**
 * Функцияя привязанные к событиями
 */
function userJoin(user) {
    try {
        var sock = this;
        var userId = util.getUserId(sock.id);
        if(typeof user.userName !== 'string'){
            sock.emit('game.join.fail', { reason : 'error.join_fail_text.name_empty' });
            return false;
        }
        user.userName = user.userName.trim();
        if (user.userName.length === 0) {
            sock.emit('game.join.fail', { reason : 'error.join_fail_text.name_empty' });
            return false;
        }
        if (user.userName.length > consts.maxUserNameLength) {
            sock.emit('game.join.fail', { reason : 'error.join_fail_text.name_too_long' });
            return false;
        }
        if (totalPlayers >= consts.serverMaxUsersCount) {
            sock.emit('game.join.fail', { reason : 'error.join_fail_text.max_user_count_exceeded' });
            return false;
        }
        var room = user.roomId;
        if (!roomList.hasOwnProperty(room)) {
            sock.emit('game.join.fail', { reason : 'error.join_fail_text.room_does_not_exist' });
            updateRoomList(sock);
            return false;
        }
        if (roomList[room].used === roomList[room].total) {
            sock.emit('game.join.fail', { reason : 'error.join_fail_text.room_overload' });
            updateRoomList(sock);
            return false;
        }
        if (userIdNames.hasOwnProperty(userId))
            return false;
        roomsData[room].clients[userId] = sock;
        
        sock.on('game.control', gameControl);
        sock.on('disconnect', userLeave);
        sock.on('game.ping', userPing);
        
        //таблицы юзера с его данными
        roomsData[room].userIdScores[userId] = 0;
        roomsData[room].userNames.push(user.userName);
        
        userIdNames[userId] = user.userName;
        userIdRooms[userId] = room;
        
        roomList[room].used++;
        if (++totalPlayers === availableTotalPlayers) {
            createRoom();
        }
        sock.join(room);
        sock.room = room;
        
        //Инициализация танка
        var label = {};
        label.hp = consts.tanksHP;
        label.userName = user.userName;
        label.userId = userId;
        
        var tank = {};
        tank.rotation = util.getRandom(0, 7) * 45;
        tank.type = 'tank';
		tank.uid = roomsData[room].uids.tank ++;
        tank.subtype = Object.keys(models.tank)[0];
        tank.size = models.tank[tank.subtype].size;
        tank.color = util.getRandom(1, consts.tankColorCount);
        var gun = {};
        gun.timeToReload = 0;
        
        var turret = {};
        turret.rotation = tank.rotation;
        turret.gun = gun;
        
        tank.position = util.getRandomPosition();
        tank.speed = 0;
        tank.turret = turret;
        tank.label = label;
        tank.moveVector = point_(0, 0);

        tank.shotMadeEventFlag = false;
        tank.drivingFlag = false;
        
        roomsData[room].tanks[userId] = tank;
        
        sock.emit('game.join.ok', {
            paintRect : {
                width : consts.showAreaWidth,
                height : consts.showAreaHeight
            },
            backgroundColor : consts.backgroundColor,
            mapSize : {
                width : consts.mapWidth,
                height : consts.mapHeight
            },
            models : models
        });
        updateOnline(room);
        updateRating(room);
        updateRoomList();
        logger.info('User[%s] connected to room[%s]', user.userName, room);
    }
    catch (e) {
        logger.critical('On try userJoin: %s', e);
        throw e;
    }
}
function gameControl(control){
    var sock = this;
	var userId = util.getUserId(sock.id);
    if (!userIdNames.hasOwnProperty(userId)) {
        return false;
    }
    var room = userIdRooms[userId];
    var tank = roomsData[room].tanks[userId];
	
	if(control.type === 'shot')
        doShot(tank);
	
	if(control.type === 'rotate')
        tank.turret.rotation = control.rotation;

    if (control.type === 'accelerate') {
        tank.rotation = control.rotation;
		if (Math.abs(control.power) > 1) {
			control.power = 1;
		}
        tank.speed = control.power * consts.tankSpeed;
        tank.rotation = Math.ceil(tank.rotation);
        tank.rotation -= tank.rotation % 45;            
        tank.moveVector = geom.moveVector(tank.rotation, tank.speed);
        tank.drivingFlag = tank.speed != 0;
    }
	
}

function gameTest () {
	var sock = this;
	if (consts.debugMode) {
        sock.emit('game.test', { roomsData : roomsData, roomList : roomList, userIdRooms : userIdRooms, userIdNames : userIdNames });
	}
}

function userLeave(){
    var socket = this;
    var userId = util.getUserId(socket.id);
    deleteUser(userId);
}

function userPing(data){
    var sock = this;
    sock.emit('game.ping', data);
}
/**
 * Вспомогательные функции
 */
 
 function updateRoomList(sock){
    if (sock !== undefined)
        sock.emit('room.list', { rooms : Object.values(roomList) });
    else
        io.emit('room.list', { rooms : Object.values(roomList) });
}


function updateRating(room){
    if (io !== undefined && roomsData.hasOwnProperty(room) && roomsData[room].userNames.length > 0) {
        var rating = [];
        var keys = Object.keys(roomsData[room].userIdScores);
        
        for (var i = 0; i < keys.length; i++) {
            rating.push({ userName : userIdNames[keys[i]], score : roomsData[room].userIdScores[keys[i]] });
        }
        rating.sort(util.ratingCmp);
        rating = rating.slice(0, consts.ratingShowUsersCount);
        io.sockets.in(room).emit('game.rating', { users : rating });
    }
}
 
 function updateOnline(room){
    if(roomsData.hasOwnProperty(room) )
        io.sockets.in(room).emit('game.online', { users : roomsData[room].userNames });
}



function deleteUser(userId){
    if (userIdNames.hasOwnProperty(userId)) {
        var room = userIdRooms[userId];
        var uname = userIdNames[userId];
        logger.info('User[%s] from room[%s] left the game',uname, room);
        util.removeFromArray(roomsData[room].userNames, uname);
        delete (userIdNames[userId]);
        delete (roomsData[room].tanks[userId]);
        delete (roomsData[room].clients[userId]);
        delete (roomsData[room].userIdScores[userId]);
        delete (userIdRooms[userId]);
        totalPlayers--;
        if (--roomList[room].used === 0 && availableTotalPlayers > totalPlayers + consts.roomMaxUserCount) {
            deleteRoom(room);
        }
        updateOnline(room);
        updateRating(room);
        updateRoomList();
    }
    
}
function doShot(tank){
    var bullet = {};
    if (tank.turret.gun.timeToReload > 0) {
        return false;
    }
    var userId = tank.label.userId;
    var room = userIdRooms[userId];
    bullet.rotation = tank.turret.rotation;
    bullet.size = models.bullet[tank.subtype].size;
    bullet.uid = roomsData[room].uids.bullet ++;
    var shotPos = tank.position;
    var model = models.tank[tank.subtype];
    var rel = geom.addToPos(model.turretCenter, model.center, -1);
    shotPos = geom.addToPos(shotPos, geom.turnVector(rel, tank.rotation), 1);
    shotPos = geom.addToPos(shotPos, geom.moveVector(tank.turret.rotation, models.turret[tank.subtype].size.length / 2 - model.turretCenter.y, 1),1)
    shotPos = geom.addToPos(shotPos, tank.moveVector, 1);
    bullet.position = shotPos;
    bullet.type = 'bullet';
    bullet.subtype = tank.subtype;
    bullet.speed = consts.bulletSpeed;
    bullet.moveVector = geom.moveVector(bullet.rotation, bullet.speed);
    bullet.owner = tank.label.userId;

    roomsData[room].bullets.push(bullet);
    tank.turret.gun.timeToReload = 1;

    var leftTime = consts.tankReloadTime;

    var updateTankReload = setInterval(
        function () {
            tank.turret.gun.timeToReload = leftTime / consts.tankReloadTime;
            leftTime -= 50;
            if (leftTime < 0) {
                clearTimeout(updateTankReload);
            }
        }, 50);
    tank.shotMadeEventFlag = true;
}
 
 function pushTanksAway (tank1, tank2, collision) {
	var v = geom.moveVector(collision.rotation, collision.distance/2);
	tank1.position = geom.addToPos(tank1.position, v, 1);
	tank2.position = geom.addToPos(tank2.position, v, -1);
}


function bulletOnTankHit(tank, bullet){
        
    tank.label.hp -= consts.damagePerShot;
    var userId = tank.label.userId;
    var room = userIdRooms[userId];
    if(roomsData[room].userIdScores[bullet.owner] !== undefined)
            roomsData[room].userIdScores[bullet.owner] += consts.scoreForHit;
    if (tank.label.hp == 0){
        tank.type = 'deleted-tank';
            roomsData[room].clients[userId].emit('game.over', { score : roomsData[room].userIdScores[userId] });
        if (roomsData[room].userIdScores[bullet.owner] !== undefined)
                roomsData[room].userIdScores[bullet.owner] += consts.scoreForKill;
        deleteUser(tank.label.userId);
    }
    updateRating(room);
    bullet.type = 'deleted-bullet';
    util.removeFromArray(roomsData[room].bullets, bullet);
}

function getPaintData(object){
    var newObj = JSON.parse(JSON.stringify(object));
    if (object.type === 'tank') {
        delete (newObj.size);
        delete (newObj.speed);
        delete (newObj.moveVector);
        delete (newObj.label.userId);
        delete (newObj.turret.gun.timeToReload);
    }
    if (object.type === 'bullet') {
        delete (newObj.size);
        delete (newObj.speed);
        delete (newObj.moveVector);
        delete (newObj.owner);
    }
    return newObj;
}

/*get average serverTick*/
function getAST(){
    var sum = 0;
    if (serverTicks.length === 0)
        return 'no ticks';
    for (var i = 0; i < serverTicks.length; i++) {
        sum += serverTicks[i];
    }
    return sum / serverTicks.length;
}



function point_(x, y){
    return { x : x, y : y };
}

function size_(width, length){
    return { width : width, length : length };
}


if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str) {
        return str !== undefined && this.indexOf(str) === 0;
    };
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
 
 /**
  * Румы
  */
var framesPerSecond = 25,
    skipTicks = 1000 / framesPerSecond;
function createRoom(){
    availableTotalPlayers += consts.roomMaxUserCount;
    var room = freeRoomIds.length > 0 ? freeRoomIds.shift() : ++curRoomId;
    roomsTimers[room] = false;
    setTimeout(roomTick, 0, room);
    roomList[room] = { used : 0, total : consts.roomMaxUserCount, id : room };
    roomsData[room] = {
        userIdScores : {},
        userNames : [],
        tanks : [],
        bullets : [],
        clients : {},
        uids: {
            bullet: 0,
            tank: 0
        },
        nextTickTime: Date.now ()
    };
    logger.info('Room[%d] created', curRoomId);
}
function deleteRoom(room){
    roomsTimers[room] = true;
    availableTotalPlayers -= consts.roomMaxUserCount;
    delete (roomsData[room]);
    delete (roomList[room]);
    logger.info('Room[%d] deleted', curRoomId);
}
function handleOutOfMapObjects (objects, room) {
    // check if objects moved out of the map
    for (var i = 0; i < objects.length; i ++) {
        var obj = objects[i],
        // check if object moved out of map and get distance to move it back
            outOfMap = geom.rectangleInsideMap (
                obj, {
                    width: consts.mapWidth,
                    height: consts.mapHeight,
                }
            );
        if (outOfMap) {
            if (obj.type === 'bullet') {
                obj.type = 'deleted-bullet';
            } else if (obj.type === 'tank') {
                obj.position = geom.addToPos (obj.position, outOfMap.delta,  1);
            }
        }
    }

    // delete deleted bullets
    for (var i = roomsData[room].bullets.length - 1; i >= 0; i --) {
        var obj = roomsData[room].bullets[i];
        if (obj.type === 'deleted-bullet') {
            roomsData[room].bullets.splice(i, 1);
        }
    }
}
/**
 * Игровой цикл
 */
function roomTick(room){
    var tickStart = Date.now ();
    if (roomList[room].used > 0) {
        var objects = Object.values(
                roomsData[room].tanks
            ).concat (
                roomsData[room].bullets
            );
        roomsData[room].nextTickTime += skipTicks;
        try {
            // move moving objects
            for (var i = 0; i < objects.length; i ++) {
                var obj = objects[i];
                if (obj.hasOwnProperty ('moveVector')) {
                    obj.position = geom.addToPos(obj.position, obj.moveVector, 1);
                }
            }

            handleOutOfMapObjects (objects, room);
            objects = Object.values(
                    roomsData[room].tanks
                ).concat (
                    roomsData[room].bullets
                );

            // get objects group for collision checking, far
            var collisionGroups = groups.getCollideGroups (objects);
            
            // check collisions between objects in groups, near
            for (var i = 0; i < collisionGroups.length; i ++) {
                var group = collisionGroups[i];
                for (var j = 1; j < group.length; j ++) {
                    for (var k = 0; k < j; k ++) {
                        var objA = objects[group[j]],
                            objB = objects[group[k]],
                        // check if objects collided and get distance to move them
                            collision = geom.TDA_rectanglesIntersect (objA, objB);
                        if (collision) {
                            if (objA.type === 'bullet') {
                                var t = objA;
                                objA = objB;
                                objB = t;
                                collision.rotation += 180;
                            }
                            if (objB.type === 'tank') {
                                var t = objA;
                                objA = objB;
                                objB = t;
                                collision.rotation += 180;
                            }
                            if (objA.type === 'tank') {
                                if (objB.type === 'tank') {
                                    pushTanksAway (
                                        objA,
                                        objB,
                                        collision
                                    );
                                } else if (objB.type === 'bullet') {
                                    if (objB.owner != objA.label.userId) {
                                        bulletOnTankHit (objA, objB);
                                    }
                                } // else if (objB.type === 'obstacle') {pushTank (...)}
                            }
                        }
                    }
                }
            }

            // Добавление обьектов типа `event`.
            // Т.к. переменная `objects` локальная,
            // то такие обьекты удалятся при выходе из функции.
            var events = [];
            for (var i = 0; i < objects.length; i ++) {
                var object = objects[i];
                if (object.type === 'tank' && object.shotMadeEventFlag) {
                    events.push ({
                        type: 'event',
                        subtype: 'gun_shot',
                        uid: object.uid,
                        position: object.position,
                        size: {
                            width: 0,
                            length: 0
                        },
                        rotation: 0
                    });
                    object.shotMadeEventFlag = false;
                }
            }
            
            handleOutOfMapObjects (objects, room);
            objects = events.concat (
                Object.values (
                    roomsData[room].tanks
                ).concat (
                    roomsData[room].bullets
                )
            );

            // send game.paint notification
            //Выделяем группы для прорисовки
            var repGroups = groups.getGroups(objects, consts.showAreaWidth + consts.maxWidthLength, consts.showAreaHeight + consts.maxWidthLength);
            var repaintGroups = [];
            var reloadData = []
            for (var i = 0; i < repGroups.length; i++) {
                var group = repGroups[i];
                var iObj = objects[i];
                if (iObj.type === 'tank') {
                    var id = objects[i].label.userId;
                    reloadData[id] = { reload : iObj.turret.gun.timeToReload, score : roomsData[room].userIdScores[id] };
                    repaintGroups[id] = [];
                    if (group !== undefined) {
                        for (var j = 0; j < group.length; j++) {
                            if (group[j] !== undefined) {
                                var curOb = objects[group[j]];
                                if (!curOb.type.startsWith('deleted')) {
                                    
                                    if (curOb.type === 'tank' && iObj.label.userId === curOb.label.userId)
                                        repaintGroups[id].splice(0, 0, getPaintData(curOb));
                                    else
                                        repaintGroups[id].push(getPaintData(curOb));
                                    
                                }
                            }
                        }
                    }
                }
            }
            var clientsIds = Object.keys(io.engine.clients);
            for (var i = 0; i < clientsIds.length; i++) {
                var uid = util.getUserId(clientsIds[i]);
                if (repaintGroups[uid] !== undefined) {
                    if (roomsData[room].clients.hasOwnProperty(uid)) {
                        roomsData[room].clients[uid].emit('game.paint', { user : reloadData[uid], objects : repaintGroups[uid] });
                    }
                }
            }
        } catch (e) {
            logger.error('error on tick: %s', e);
        }
    }
    // tick timing
    var tickEnd = Date.now (),
        timeToSleep = roomsData[room].nextTickTime - tickEnd,
        serverTick = tickEnd - tickStart;
    if (timeToSleep < 0) {
        timeToSleep = 0;
    }
    serverTick /= 1000;
    if (serverTicks.length > consts.saveServerTickCount) {
        serverTicks.shift ();
    }
    serverTicks.push (serverTick);
    if (!roomsTimers[room]) {
        setTimeout (roomTick, timeToSleep, room);
    } else {
        delete roomsTimers[room];
    }
}



