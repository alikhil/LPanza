var eps = 0.0001;

exports.rectanglesIntersect = rectanglesIntersect;
exports.rectangleContainsPoint = rectangleContainsPoint;
exports.pointInLeft = pointInLeft;
exports.vectorMult = vectorMult;
exports.makeVector = makeVector;
exports.getRect = getRect;
exports.addToPos = addToPos;
exports.moveVector = moveVector;
exports.vectorToScalar = vectorToScalar;
exports.scalarMult = scalarMult;
exports.vectorsAreParallel = vectorsAreParallel;

exports.TDA_rectanglesIntersect = TDA_rectanglesIntersect;

/**
 * Теорема о разделяющих осях
 * */
function radToDeg (angle) {
	return 180*(angle/Math.PI);
}
function degToRad (angle) {
	return Math.PI*(angle/180);
}
function TDA_rectanglesIntersect (rect1, rect2) {
	var axes = [
			degToRad(rect1.rotation),
			degToRad(rect1.rotation + 90),
			degToRad(rect2.rotation),
			degToRad(rect2.rotation + 90)
		],
		points = [
			getRect(
				rect1.position,
				rect1.size,
				radToDeg(rect1.rotation)
			),
			getRect(
				rect2.position,
				rect2.size,
				radToDeg(rect2.rotation)
			)
		],
		delta,
		minDelta = Infinity,
		minDeltaId,
		ranges = [],
		range,
		projected,
		result = {
			collide: true,
			rotation: NaN,
			distance: NaN
		};
	for(var j = 0; j < axes.length; j ++) {
		ranges.splice(0, ranges.length);
		for(var i = 0; i < points.length; i ++) {
			range = {left: Infinity, right: -Infinity};
			for(var k in points[i]) {
				projected = TDA_toAxis(axes[j], 
					points[i][k]
				);
				if(range.right < projected) {
					range.right = projected;
				}
				if(projected < range.left) {
					range.left = projected;
				}
			}
			ranges.push(range);
		}
		if(ranges[0].right < ranges[1].left ||
			ranges[1].right < ranges[0].left) {
			result.collide = false;
			break;
		}
		delta = Math.min(
			Math.abs(ranges[0].right - ranges[1].left),
			Math.abs(ranges[1].right - ranges[0].left)
		);
		if(delta < minDelta) {
			minDelta = delta;
			minDeltaId = j;
		}
	}
	if(!result.collide) {
		result.rotation = axes[minDeltaId];
		result.distance = minDelta;
	}
	return result;
}
function TDA_toAxis (angle, point) {
	var xa = point.x,
		ya = point.y,
		f = angle,
		d, xb, yb,
		tf = Math.tan(f),
		cf = Math.cos(f),
		p;
	if(cf == 0) {
		// doesn't work because of precision - cos is not equal 0
		xb = 0;
		yb = ya;
	} else if(ya - tf*xa == 0) {
		// point is on line, can't use zero length vector
		xb = xa;
		yb = ya;
	} else {
		xb = (xa + ya * tf)/(1 + tf*tf);
		yb = xb * tf;
	}
	p = Math.sqrt(xb*xb + yb*yb);
	if(xb < 0 || xb == 0 && yb > 0) {
		p *= -1;
	}
	return p;
}

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
 * Скалярное произведение
 * */
function scalarMult(a, b){
    return a.x * b.x + a.y * b.y;
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
    var right = moveVector(rotation - 90, size.length / 2);
    
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

/**
 * Умножение вектора на число
 * */
function vectorToScalar(v, k){
    var nv = v;
    nv.x *= k;
    nv.y *= k;
    return nv;
}
/**
 * Проверка векторов на параллельность
 * */
function vectorsAreParallel(a, b){
    return vectorMult(a, b) == 0;
}
/**
 * Проверка векторов на перпендикулярность
 * */
function vectorsArePerpendicular(a, b){
    return scalarMult(a, b) == 0;
}

exports.vectorsAreCodirectional = vectorsAreCodirectional;
/**
 * Проверка векторов на сонаправленность
 * */
function vectorsAreCodirectional(a, b){
    var A = vectorToScalar(a, 1 / vectorLength(a));
    var B = vectorToScalar(b, 1 / vectorLength(b));
    
    return (doubleEqual(A.x, B.x) && doubleEqual(A.y, B.y));
}

exports.vectorLength = vectorLength;
/**
 * Вычисление длины вектора
 * */
function vectorLength(a){
    return Math.sqrt(a.x * a.x + a.y * a.y);
}

exports.dEq = doubleEqual;
/**
 * Равность двух нецелых чисел с погрешностью
 * */
function doubleEqual(a, b){
    return Math.abs(b - a) < eps;
}