var io;
var consts = require('./constants.js');
var logger = require('intel').getLogger('logger');
var geom = require('./geom');
var groups = require('./group.js');
var util = require('./util.js');

var roomsCount = 0;
var totalPlayers = 0;
var availableTotalPlayers = 0;
var freeRoomIds = [];
var rooms = {};

exports.init = function(sio){
	io = sio;
}

exports.create = function(){
	roomsCount++;
	var roomId = freeRoomIds.length > 0 ? freeRoomIds.shift() : roomsCount;

	availableTotalPlayers += consts.roomMaxUserCount;
	var room = {
		id : roomId,
		/**  Словарь Id -> Имя юзера  */
		dictIdNames : {},
		/**  Словарь Id -> Набранное кол-во очков юзера */
		dictIdScores : {},
		/** Список имен подключенных юзеров */
		userNames : [],
		tanks : [],
		bullets : [],
		/**  Подключенные сокеты */
		clients : {},
		/**  Идшники для нумерации объектов на сцене  */
		uids: {
            bullet: 0,
            tank: 0
        },
        nextTick : Date.now(),
		/** Текущее кол-во юзеров */
		playersCount : 0,
		/** Максимальное кол-во допустимых юзеров */
		availablePlayersCount : consts.roomMaxUserCount,
		/** Возваращает данные для отправки списка серверов клиенту */
		getRoomList : function(){
			return { used : this.playersCount, total : this.availablePlayersCount, id : this.id };
		},
		/** Удаление комнаты */
		deleteRoom : function(){
			clearInterval(this.timer);
		    availableTotalPlayers -= this.availablePlayersCount;
		    logger.info('Room[%d] deleted', this.id);
			freeRoomIds.push(this.id);
            delete(rooms[this.id]);
			delete(this);
		},
		joinPlayer : playerJoin
		
	};
    room.timer = setTimeout(serverTick, 1, room),
	rooms[roomId] = room;
    logger.info('Room[%d] created', roomId);
	return room;
}

function playerJoin(sock, user) {
	try {
		var room = this;
		var userId = util.getUserId(sock.id);
		var roomId = user.roomId;
		
	 	room.clients[userId] = sock;
        
        sock.on('game.control', gameControl);
        sock.on('disconnect', userLeave);
        sock.on('game.ping', userPing);
        
        //таблицы юзера с его данными
        room.dictIdScores[userId] = 0;
        room.userNames.push(user.userName);
        
        room.dictIdNames[userId] = user.userName;
        
        room.playersCount++;
		
        if (++totalPlayers === availableTotalPlayers) {
            exports.create();
        }
        sock.join(roomId);
        sock.room = roomId;
        
        //Инициализация танка
        var label = {};
        label.hp = consts.tanksHP;
        label.userName = user.userName;
        label.userId = userId;
        
        var tank = {};
        tank.rotation = util.getRandom(0, 7) * 45;
        tank.type = 'tank';
		tank.uid = room.uids.tank ++;
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
        tank.moveVector = util.point(0, 0);
        
        room.tanks[userId] = tank;
        
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
        logger.info('User[%s] connected to room[%s]', user.userName, room.id);
    }
    catch (e) {
        logger.critical('On try userJoin: %s', e);
        throw e;
    }
}

function userLeave(){
    var socket = this;
    var userId = util.getUserId(socket.id);
    deleteUser(userId, rooms[socket.room]);
}

function userPing(data){
    var sock = this;
    sock.emit('game.ping', data);
}

function gameControl(control){
    var sock = this;
	var userId = util.getUserId(sock.id);
    var room = rooms[sock.room];
    if (!room.dictIdNames.hasOwnProperty(userId)) {
        return false;
    }
    var tank = room.tanks[userId];
	
	if(control.type === 'shot')
        doShot(tank, room);
	
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
    }
	
}

function doShot(tank, room){
    var bullet = {};
    if (tank.turret.gun.timeToReload > 0) {
        return false;
    }
    bullet.rotation = tank.turret.rotation;
    bullet.size = models.bullet[tank.subtype].size;
    bullet.uid = room.uids.bullet ++;
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

    room.bullets.push(bullet);
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
}
 
 
 function updateOnline(room){
    if(room !== undefined)
        io.sockets.in(room.id).emit('game.online', { users : room.userNames });
}


function updateRating(room){
    if (io !== undefined && room !== undefined && room.userNames.length > 0) {
        var rating = [];
        var keys = Object.keys(room.dictIdScores);
        
        for (var i = 0; i < keys.length; i++) {
            rating.push({ userName : room.dictIdNames[keys[i]], score : room.dictIdScores[keys[i]] });
        }
        rating.sort(util.ratingCmp);
        rating = rating.slice(0, consts.ratingShowUsersCount);
        io.sockets.in(room.id).emit('game.rating', { users : rating });
    }
}

 
 function updateRoomList(sock){
     var roomList = [];
     var rms = Object.values(rooms);
     for(var i = 0;i < rms.length; i++){
         roomList.push(rms[i].getRoomList());
     }
    if (sock !== undefined)
        sock.emit('room.list', { rooms : roomList });
    else
        io.emit('room.list', { rooms : roomList });
}

function serverTick(room){
    room.nextTick = Date.now();
	if(room.playersCount !== 0)
        {
            try
            {
 
                for (var i = room.bullets.length - 1; i >= 0; i--) {
                    var inside = geom.rectangleInsideMap (
                           room.bullets[i], {
                                width: consts.mapWidth,
                                height: consts.mapHeight,
                            }
                        );
                    if (!inside.in) {
                        room.bullets.splice(i, 1);
                    }
                }
                var objects = Object.values(room.tanks).concat(room.bullets);
                var objectGroups = groups.getCollideGroups(objects);
                var moved = Array(objects.length);
                //группы для проверки на коллизию
                for (var i = 0; i < objects.length; i++) {
                    var group = objectGroups[i];
            
                    for (var j = 0; j < group.length; j++) {
                        var curObject = objects[group[j]];
                        if (moved[group[j]] !== 'moved') {
                            try {
                                var newPos = geom.addToPos(curObject.position, curObject.moveVector, 1);
                            }
                        catch (e) {
                                logger.error('Trying to move object: ' + e);
                            }
                            if (curObject.type === 'tank') {
                                for (var h = 0; h < group.length; h++) {
                                    var cur = objects[group[h]];
                                    if (cur.type === 'tank') {
                                        var collision = geom.TDA_rectanglesIntersect(
                                            cur,
            							curObject
                                        );
                                        if (collision.collide) {
                                            pushTanksAway(
                                                cur,
            								curObject,
            								collision.rotation,
            								collision.distance
                                            );
                                        }
                                    }
                                }
                                curObject.position.x = newPos.x;
                                curObject.position.y = newPos.y;
            
                                var inside = geom.rectangleInsideMap (
                                    curObject, {
                                        width: consts.mapWidth,
                                        height: consts.mapHeight,
                                    }
                                );
                                if (!inside.in) {
                                    curObject.position.x += inside.delta.x;
                                    curObject.position.y += inside.delta.y;
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
                                        if (collision.collide && cur.label.userId != curObject.owner) {
                                            bulletOnTankHit(cur, curObject, room);
                                            if (curObject.type === 'deleted-bullet') {
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            objects[group[j]] = curObject;
                            moved[group[j]] = 'moved';
                        }
                    
                    }
                }
                
                //Выделяем группы для прорисовки
                var repGroups = groups.getGroups(objects, consts.showAreaWidth + consts.maxWidthLength, consts.showAreaHeight + consts.maxWidthLength);
                var repaintGroups = [];
                var reloadData = []
                for (var i = 0; i < repGroups.length; i++) {
                    var group = repGroups[i];
                    var iObj = objects[i];
                    if (iObj.type === 'tank') {
                        var id = objects[i].label.userId;
                        reloadData[id] = { reload : iObj.turret.gun.timeToReload, score : room.dictIdScores[id] };
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
                        if (room.clients.hasOwnProperty(uid)) {
                            room.clients[uid].emit('game.paint', { user : reloadData[uid], objects : repaintGroups[uid] });
                        }
                    }
                }
        }
         catch(e){
        logger.error('error on tick: %s', e);
    }
    }
    room.nextTick += 1000 / consts.framesPerSecond;
    var timeToSleep =room.nextTick - Date.now ();
    if (timeToSleep < 0) {
        timeToSleep = 0;
    }
    setTimeout (serverTick, timeToSleep, room);
}


 function pushTanksAway (tank1, tank2, rotation, distance) {
	var v = geom.moveVector(rotation, distance/2);
	tank1.position = geom.addToPos(tank1.position, v, 1);
	tank2.position = geom.addToPos(tank2.position, v, -1);
}

function bulletOnTankHit(tank, bullet, room){
        
    tank.label.hp -= consts.damagePerShot;
    var userId = tank.label.userId;
    if(room.dictIdScores[bullet.owner] !== undefined)
            room.dictIdScores[bullet.owner] += consts.scoreForHit;
    if (tank.label.hp == 0){
        tank.type = 'deleted-tank';
            room.clients[userId].emit('game.over', { score : room.dictIdScores[userId] });
        if (room.dictIdScores[bullet.owner] !== undefined)
                room.dictIdScores[bullet.owner] += consts.scoreForKill;
        deleteUser(tank.label.userId, room);
    }
    updateRating(room);
    bullet.type = 'deleted-bullet';
    util.removeFromArray(room.bullets, bullet);
}

function deleteUser(userId, room){
    if (room.dictIdNames.hasOwnProperty(userId)) {
        var uname = room.dictIdNames[userId];
        logger.info('User[%s] from room[%s] left the game',uname, room.id);
        util.removeFromArray(room.userNames, uname);
        delete (room.dictIdNames[userId]);
        delete (room.tanks[userId]);
        delete (room.clients[userId]);
        delete (room.dictIdScores[userId]);
        totalPlayers--;
        if (--room.playersCount === 0 && availableTotalPlayers > totalPlayers + consts.roomMaxUserCount) {
           room.deleteRoom();
        }
        updateOnline(room);
        updateRating(room);
        updateRoomList();
    }
    
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

exports.roomsCount = roomsCount;
exports.updateRoomList = updateRoomList;
exports.totalPlayers = totalPlayers;
exports.rooms = rooms;