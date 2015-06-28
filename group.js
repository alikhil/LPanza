/*Было много функций, поэтому решил вынести в отдельный файл*/

var maxWidth; // = 3000;
var maxHeight; // = 3000;

var objectsCount; // = 300;

var ceilWidth = 50;
var ceilHeight = 50;

var objects = [];

// дерево фенвик 2D
var tree = [];

exports.init = function (maxWidthL, maxHeightL){
    maxWidth = maxWidthL;
    maxHeight = maxHeightL;
}

var _und = require("./underscore-min");

var map;
var groups;
var n, m;
exports.getCollideGroups = function(objects_) {
    groups = [];
    map = [];
    objects = objects_;
    n = maxHeight / ceilHeight, m = maxWidth / ceilWidth;
    for (var i = 0; i < n; i++)
        map[i] = Array(m);

    for (var i = 0; i < objects_.length; i++) {
        groups[i] = [];
        var ip = objects_[i].position;
        var intedPoint = intPoint({ x : ip.x / ceilWidth, y : ip.y / ceilHeight });
        if (map[intedPoint.y][intedPoint.x] === undefined)
            map[intedPoint.y][intedPoint.x] = [];

        map[intedPoint.y][intedPoint.x].push(i);
    }
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < m; j++) {
            if (map[i][j] !== undefined) {
                for (var k = 0; k < map[i][j].length; k++) {
                    groups[map[i][j][k]] = _und.union(groups[map[i][j][k]], map[i][j]);
                }
                if (j < m - 1) {
                    if (i != 0) {
                        workOn(j, i, j + 1, i - 1);
                    }
                    if (i < n - 1) {
                        workOn(j, i, j + 1, i + 1);
                    }
                    workOn(j, i, j + 1, i);
                }
                if (i < n - 1) {
                    workOn(j, i, j, i + 1);
                }
            }
        }
    }

    return groups;
}
function workOn(x, y, xx, yy) {
    if (map[y][x] === undefined || map[yy][xx] === undefined || (x === xx && y === yy))
        return false;
    var first = map[y][x].length, second = map[yy][xx].length;
    for (var i = 0; i < first; i++) {
        for (var j = 0; j < second; j++) {
            
            groups[map[y][x][i]] = union(groups[map[y][x][i]], map[yy][xx]);
            groups[map[yy][xx][j]] = union(groups[map[yy][xx][j]], map[y][x]);
        }
    }
}
function intPoint(a){
    return { x : Math.floor(a.x), y : Math.floor(a.y) };
}
/**
 * Получаем список груп для каждого объекта соответсвенно
 * */
exports.getGroups = function(objectsL, takeWidth, takeHeight) {
    groups = [];
    var dx = takeWidth / 2;
    var dy = takeHeight / 2;
    for (var i = 0; i < objects.length; i++) {
        var l = Math.floor(Math.max(objects[i].position.x - dx, 0) / ceilWidth);
        var r = Math.floor(Math.min(objects[i].position.x + dx, maxWidth) / ceilWidth);
        var u = Math.floor(Math.max(objects[i].position.y - dy, 0) / ceilHeight);
        var d = Math.floor(Math.min(objects[i].position.y + dy, maxHeight) / ceilHeight);
        var cur = intPoint({ x : objects[i].position.x / ceilWidth, y : objects[i].position.y / ceilHeight });
        if (cur.x == m)
            cur.x--;
        if (cur.y == n)
            cur.y--;
        if (map[cur.y][cur.x] !== undefined) {
            for (var k = 0; k < map[cur.y][cur.x].length; k++) {
                groups[map[cur.y][cur.x][k]] = union(groups[map[cur.y][cur.x][k]], map[cur.y][cur.x]);
            }
        }
        for (var j = u; j < d; j++) {
            for (var k = l; k < r; k++) {
                workOn(cur.x, cur.y, j, k);
            }
        }
    }
    

    return groups;
}

function union(a, b){
    if (a === undefined || b === undefined) {
        return a === undefined ? (b === undefined ? [] : b) : a;
    }
    return _und.union(a, b);
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
