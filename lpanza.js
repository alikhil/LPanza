var io;
var gameSocket;
//

var consts = require('./constants.js');

var models = {
        'tank': {
            'КВ-1': {
                size: {
                    width: consts.tankWidth,		
                    length: consts.tankWidth
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
                width: consts.bulletWidth,		
                length: consts.bulletLength
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

var clients = {};

var _und = require('./underscore-min');
var groups = require('./group.js');
var geom = require('./geom.js');

groups.init(consts.mapWidth, consts.mapHeight);

exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
	var userId = getUserId(socket.id);
	
    gameSocket.on('game.join', userJoin);
    gameSocket.on('game.test', gameTest);
}

exports.startServer = function (){
    timer = setInterval(serverTick, consts.serverTickDelay);
}
function userJoin(user) {
	var sock = this;
	var userId = getUserId(sock.id);
    clients[userId] = sock;
    user.userName = user.userName.trim();
    if (user.userName.length == 0) {
        sock.emit('game.join.fail', { reason : 'error.join_fail_text.name_empty' });
        if (consts.debugMode)
            console.log(user.userName + ' не смог подключиться');
    }
    if (user.userName.length > consts.maxUserNameLength) {
        sock.emit('game.join.fail', { reason : 'error.join_fail_text.name_too_long' });
        if (consts.debugMode)
            console.log(user.userName + ' не смог подключиться');
        return false;
    }
	if(userNames.length >= consts.serverMaxUsersCount){
		sock.emit('game.join.fail', { reason : 'error.join_fail_text.max_user_count_exceeded'});
		if(consts.debugMode)
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
	label.hp = consts.tanksHP;
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
    turret.gun = gun;
	
    tank.position = getRandomPosition();
	tank.speed = 0;
	tank.turret = turret;
	tank.label = label;
    tank.moveVector = point_(0, 0);

	tanks[userId] = tank;
	if(consts.debugMode){
		console.log('userIdNames: ', userIdNames);
		console.log('userNames: ', userNames);
		console.log('tanks: ', tanks);
        console.log('bullets: ', bullets);
	}
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
        models :  models 
    });
	if(consts.debugMode)
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
        rating = rating.slice(0, consts.ratingShowUsersCount);
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
        if (consts.debugMode)
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
        tank.speed = control.power * consts.tankSpeed;
        tank.moveVector = geom.moveVector(tank.rotation, tank.speed);
    }
	
}

function gameTest () {
	var sock = this;
	if (consts.debugMode) {
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
    var shotPos = tank.position;
    //shotPos = geom.addToPos(shotPos, geom.turnVector(models.tank[tank.subtype].turretCenter, tank.rotation), 1);
    //shotPos = geom.addToPos(shotPos, geom.moveVector(bullet.rotation, models.turret[tank.subtype].size.length - models.turret[tank.subtype].center.y),1);
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

    bullets.push(bullet);
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

if (typeof String.prototype.startsWith != 'function') {
    // see below for better implementation!
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
//пока не буду отслеживать колизии танков и снарядов
function serverTick(){
   
    if (userNames.length > 0) {
        console.time('serverTick');
       // console.time('delete-bullets');
        for (var i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i].position.x > consts.mapWidth || 
                bullets[i].position.y > consts.mapHeight || 
                bullets[i].position.x < 0 ||
                bullets[i].position.y < 0) {
                bullets.splice(i, 1);
            }
        }
        //console.timeEnd('delete-bullets');
        //console.time('collide-groups');
        var objects = Object.values(tanks).concat(bullets);
        var deleteIds = [];
        var objectGroups = groups.getCollideGroups(objects);
        var moved = Array(objects.length);
        //группы для проверки на коллизию
        for (var i = 0; i < objects.length; i++) {
            var group = objectGroups[i];
            var groupNewPos = [];

            for (var j = 0; j < group.length; j++) {
                var curObject = objects[group[j]];
                if (moved[group[j]] !== 'moved') {
                    try{
                        var newPos = geom.addToPos(curObject.position, curObject.moveVector, 1);
                    }
                    catch(e)  {
                        console.log(e);
                        console.log(curObject);
                        console.log(groups);
                    }
                        if (curObject.type === 'tank') {
                            curObject.position.x = 
                        (newPos.x < curObject.size.width / 2) ? 
                            curObject.size.width / 2 : 
                            (newPos.x > consts.mapWidth - curObject.size.width / 2) ? 
                                consts.mapWidth - curObject.size.width / 2 : 
                                newPos.x;
                            
                            curObject.position.y = 
                        (newPos.y < curObject.size.length / 2) ?
                            curObject.size.length / 2 :
                            (newPos.y > consts.mapHeight - curObject.size.length / 2) ?
                             consts.mapHeight - curObject.size.length / 2 : 
                             newPos.y;
                            
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
                                    if (cur.type === 'deleted-tank') {
                                        deleteIds.push(group[h]);
                                    }
                                    deleteIds.push(group[j]);
								}
                            }
                        }
                    }
                    objects[group[j]] = curObject;
                    moved[group[j]] = 'moved';
                } 
                
            }
        }
        
        //console.timeEnd('collide-groups');
        //console.time('repaint-groups');
        //console.time('get-repaint');
        //Выделяем группы для прорисовки
        var repGroups = groups.getGroups(objects, consts.showAreaWidth + consts.maxWidthLength, consts.showAreaHeight + consts.maxWidthLength);
        var repaintGroups = [];
        var reloadData = []
        for (var i = 0; i < repGroups.length; i++) {
            var group = repGroups[i];
            var iObj = objects[i];
            if (iObj.type === 'tank') {
                var id = objects[i].label.userId;
                reloadData[id] = { reload : iObj.turret.gun.timeToReload, score : userIdScores[id] };
                repaintGroups[id] = [];
                if (group !== undefined) {
                    for (var j = 0; j < group.length; j++) {
                        if (group[j] !== undefined) {
                            var curOb = objects[group[j]];
                            if (!curOb.type.startsWith('deleted')) {
                                {
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
        }
            //console.timeEnd('get-repaint');
            //console.time('send-repaint');
            var clientsIds = Object.keys(io.engine.clients);
            for (var i = 0; i < clientsIds.length; i++) {
                var uid = getUserId(clientsIds[i]);
                if (repaintGroups[uid] !== undefined) {
                    if (clients.hasOwnProperty(uid)) {
                        console.time('paint');
                        clients[uid].emit('game.paint', { user : reloadData[uid], objects : repaintGroups[uid] });
                        console.timeEnd('paint');
                    }
                }
            }
            //console.timeEnd('send-repaint');
            // console.timeEnd('repaint-groups');
            console.timeEnd('serverTick');
        
    }
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
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
    tank.label.hp -= consts.damagePerShot;
    if(userIdScores[bullet.owner] !== undefined)
        userIdScores[bullet.owner] += consts.scoreForHit;
    if (tank.label.hp == 0){
        tank.type = 'deleted-tank';
        clients[tank.label.userId].emit('game.over', { score : userIdScores[tank.label.userId] });
        if (userIdScores[bullet.owner] !== undefined)
            userIdScores[bullet.owner] += consts.scoreForKill;
        deleteUser(tank.label.userId);
    }
    updateRating();
    bullet.type = 'deleted-bullet';
    removeFromArray(bullets, bullet);
}

function getPaintData(object){
    // TODO сделать объект только с нужными свойствами
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
	pos.x = getRandom(consts.distanceFromWall,consts.mapWidth - consts.distanceFromWall);
	pos.y = getRandom(consts.distanceFromWall,consts.mapHeight - consts.distanceFromWall);
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
//ы


