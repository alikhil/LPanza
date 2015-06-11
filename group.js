/*Было много функций, поэтому решил вынести в отдельный файл*/

var maxWidth; // = 3000;
var maxHeight; // = 3000;

var objectsCount; // = 300;

var objects = [];

// дерево фенвик 2D
var tree = [];

exports.init = function (maxWidthL, maxHeightL){
    maxWidth = maxWidthL;
    maxHeight = maxHeightL;
}

var _und = require("./underscore-min");



/**
 * Получаем список груп для каждого объекта соответсвенно
 * */
exports.getGroups = function(objectsL, takeWidth, takeHeight) {
    var groups = [];
    tree = [];

    objects = objectsL;
    objectsCount = objects.length;
    
    var dx = Math.floor(takeWidth / 2);
    var dy = Math.floor(takeHeight / 2);

    for (var i = 0; i <= maxWidth; i++)
        tree[i] = Array(maxHeight + 1);
    
    for (var i = 0; i < objectsCount; i++) {
        addObject(objects[i], i);
    }

    for (var i = 0; i < objectsCount; i++) {
        var obPos = objects[i].position;
        groups[i] = getPointsInRect(obPos.x - dx, obPos.y - dy, obPos.x + dx, obPos.y + dy);
    }
    return groups;
}

/**
 * Добавляем точку в дерево
 * */
function addPoint(x, y, id) {
    for (var i = x; i <= maxWidth; i = (i | (i + 1))) {
        for (var j = y; j <= maxHeight; j = (j | (j + 1))) {
            var oldArray = tree[i][j];
            if (oldArray == undefined) {
                oldArray = [];
            }
            oldArray.push(id);
            tree[i][j] = _und.uniq(oldArray);
        }
    }
}

/**
 * Убираем точку с дерева
 * */
function removePoint(x, y, id) {
    for (var i = x; i <= maxWidth; i = (i | (i + 1))) {
        for (var j = y; j <= maxHeight; j = (j | (j + 1))) {
            var oldArray = tree[i][j];
            tree[i][j] = _und.difference(oldArray, [id]);
        }
    }
}

/**
 * Получаем все точки, которые лежат в прямоугольнике с точками (0;0) и (x;y)
 * */
function getPoints(x, y) {
    if (x < 0)
        x = 0;
    if (x > maxWidth)
        x = maxWidth;
    if (y < 0)
        y = 0;
    if (y > maxHeight)
        y = maxHeight;
    
    var points = [];
    for (var i = x; i >= 0; i = (i & (i + 1)) - 1) {
        for (var j = y; j >= 0; j = (j & (j + 1)) - 1) {
            var oldArray = tree[i][j];
            if (oldArray == undefined) {
                oldArray = [];
            }
            points= _und.union(points, oldArray);
        }
    }
    return points;
}
/**
 * Получаем id всех объектов которые лежат на заданом прямогуольнике с точками (x ; y) и (xx ; yy)
 * */
function getPointsInRect(x, y, xx, yy) {
    xx = Math.floor(xx);
    x = Math.floor(x);
    yy = Math.floor(yy);
    y = Math.floor(y);
    var bigRect = getPoints(xx, yy);
    var downRect = getPoints(xx, y);
    var leftRect = getPoints(x, yy);

    //точки которые лежат на границе
    var mootPoints = [];

    for (var i = 0; i < leftRect.length; i++) {
        var p = leftRect[i];
        if (objects[p].position.x == x && objects[p].position.y >= y) {
            mootPoints.push(p);
        }
    }
    for (var i = 0; i < downRect.length; i++) {
        var p = downRect[i];
        if (objects[p].position.y == y && objects[p].position.x >= x) {
            mootPoints.push(p);
        }
    }
    return _und.union(_und.difference(_und.difference(bigRect, downRect), leftRect), mootPoints);
}
/**
 * Добавляем объект в дерево. Обертка над addPoint
 * */
function addObject(ob, id) {
    var x = Math.floor(ob.position.x);
    var y = Math.floor(ob.position.y);
    addPoint(x, y, id);
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
