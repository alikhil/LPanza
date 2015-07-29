/**
 *  Объявления 
 */
var io;
var gameSocket;

var consts = require('./constants.js');


var _und = require('./underscore-min');
var groups = require('./group.js');
var geom = require('./geom.js');
var util = require('./util.js');
var rooms = require('./room.js');
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
    rooms.init(sio);
    rooms.updateRoomList(socket);
    gameSocket.on('game.join', userJoin);
}

exports.startServer = function (){
    rooms.create();
}
/**
 * Функцияя привязанные к событиями
 */
function userJoin(user) {
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
        if (rooms.totalPlayers >= consts.serverMaxUsersCount) {
            sock.emit('game.join.fail', { reason : 'error.join_fail_text.max_user_count_exceeded' });
            return false;
        }
        var room = user.roomId;
        if (!rooms.rooms.hasOwnProperty(room)) {
            sock.emit('game.join.fail', { reason : 'error.join_fail_text.room_does_not_exist' });
            rooms.updateRoomList(sock);
            return false;
        }
        if (rooms.rooms[room].playersCount === rooms.rooms[room].availablePlayersCount) {
            sock.emit('game.join.fail', { reason : 'error.join_fail_text.room_overload' });
            rooms.updateRoomList(sock);
            return false;
        }
        if (rooms.rooms[room].dictIdNames.hasOwnProperty(userId))
            return false;
        rooms.rooms[room].joinPlayer(sock, user);
}
