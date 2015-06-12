

exports.rectanglesIntersect = rectanglesIntersect;
exports.rectangleContainsPoint = rectangleContainsPoint;
exports.pointInLeft = pointInLeft;
exports.vectorMult = vectorMult;
exports.makeVector = makeVector;
exports.getRect = getRect;
exports.addToPos = addToPos;
exports.moveVector = moveVector;

/**
 * Пересекаются ли два данных прямоугольника
 * */
function rectanglesIntersect(a, b) {
    return rectangleContainsPoint(a, b.topLeft) || 
    rectangleContainsPoint(a, b.topRight) || 
    rectangleContainsPoint(a, b.bottomLeft) ||
    rectangleContainsPoint(a, b.bottomRight);
}

function rectangleContainsPoint(rect, point) {
    return pointInLeft(point, rect.bottomLeft, rect.bottomRight) &&
    pointInLeft(point, rect.bottomRight, rect.topRight) &&
    pointInLeft(point, rect.topRight, rect.topLeft) &&
    pointInLeft(point, rect.topLeft, rect.bottomLeft);
}

/**
 * Точка находится левее вектора?
 * */
function pointInLeft(point, a, b) {
    return vectorMult(makeVector(a, point), makeVector(a, b)) < 0;
}


/**
 * Векторное произведение
 * */
function vectorMult(a, b) {
    return a.x * b.y - a.y * b.x;
}
/**
 * Получаем вектор из двух точек
 * */
function makeVector(a, b) {
    return addToPos(b, a, -1);
}

/**
 * Получаем массив точек прямоугольника в центром данной точке
 * */
function getRect(center, size, rotation) {
    
    var forward = moveVector(rotation, size.width / 2);
    var right = moveVector(rotation - 90, size.height / 2);
    
    var forwardRight = addToPos(addToPos(center, forward, 1), right, 1);
    var forwardLeft = addToPos(addToPos(center, forward, 1), right, -1);
    var backwardRight = addToPos(addToPos(center, forward, -1), right, 1);
    var backwardLeft = addToPos(addToPos(center, forward, -1), right, -1);
    
    return { topLeft : forwardLeft, topRight : forwardRight, bottomLeft : backwardLeft, bottomRight : backwardRight };
}
/**
 * Добавляем вектор к данной точке
 * */
function addToPos(position, add, mult) {
    var pos = {
        x : position.x + add.x * mult,
        y : position.y + add.y * mult
    };
    return pos;
}

function moveVector(rotation, dist) {
    var angle = (Math.PI / 180) * rotation;
    var y = Math.sin(angle) * dist;
    var x = Math.cos(angle) * dist;
    return { x : x, y : y };
}