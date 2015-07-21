/* Вспомогательные функции */
exports.getRandomPosition = getRandomPosition;
exports.getRandom = getRandom;
exports.getUserId - getUserId;
exports.removeFromArray = removeFromArray;
exports.positionComparator = positionComparator;

var consts = require('./constants.js');

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

function positionComparator(a, b) {
    if (a.position.y == b.position.y) {
        if (a.position.x == b.position.x)
            return 0;
        return a.position.x < b.position.x ? -1 : 1;
    }
    return a.position.y < b.position.y ? -1 : 1;
}

