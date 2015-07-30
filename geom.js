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
exports.rectangleInsideMap = rectangleInsideMap;

/**
 * Теорема о разделяющих осях
 * */
function radToDeg (angle) {
	return 180*(angle/Math.PI);
}
function degToRad (angle) {
	return Math.PI*(angle/180);
}
function rectangleInsideMap (rect, mapSize) {
	var points = getRect (
			rect.position,
			rect.size,
			rect.rotation
		),
		t,
		rangeIn,
		rangeOut,
		result = {
			in: true,
			delta: {
				x: 0,
				y: 0
			}
		};
	t = {
		x: [],
		y: []
	};
	for(var i in points) {
		t.x.push (points[i].x);
		t.y.push (points[i].y);
	}
	points = t;
	rangeOut = {
		x: {
			left: 0,
			right: mapSize.width
		},
		y: {
			left: 0,
			right: mapSize.height
		}
	};
	for (var i in rangeOut) {
		rangeIn = {
			left: Math.min.apply (null, points[i]),
			right: Math.max.apply (null, points[i])
		};
		if (rangeIn.left < rangeOut[i].left) {
			result.delta[i] = rangeOut[i].left - rangeIn.left;
		} else if (rangeIn.right > rangeOut[i].right) {
			result.delta[i] = rangeOut[i].right - rangeIn.right;
		}
		result.in &= result.delta[i] == 0;
	}
	if (!result.in) {
		result = false;
	}
	return result;
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
				rect1.rotation
			),
			getRect(
				rect2.position,
				rect2.size,
				rect2.rotation
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
				projected = TDA_toAxis(
					axes[j],
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
	if(result.collide) {
		var projeted2;
		result.rotation = angleToRight(radToDeg(axes[minDeltaId]));
		axes[minDeltaId] = degToRad(result.rotation);
		result.distance = minDelta;
		projected = TDA_toAxis(
			axes[minDeltaId],
			rect1.position
		);
		projected2 = TDA_toAxis(
			axes[minDeltaId],
			rect2.position
		);
		if(projected2 > projected) {
			result.distance *= -1;
		}
	} else {
		result = false;
	}
	return result;
}
function angleToRight (deg) {
	return (deg+90)%180-90;
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
    
    var forward = moveVector(rotation, size.length / 2);
    var right = moveVector(rotation - 90, size.width / 2);
    
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

exports.turnVector = turnVector;
/**
 * Поворот вектора на угол
 * */
function turnVector(v, a) {
    var sa = Math.sin(a);
    var ca = Math.cos(a);
    var np = { x : v.x * ca + v.y * sa, y : v.y * ca - v.x * sa };
    return np;
}