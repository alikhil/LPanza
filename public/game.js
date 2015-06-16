var utils = {
	point: function (x, y) {
		return {x: x, y: y};
	},
	sizeWH: function (width, height) {
		return {width: width, width: width};
	},
	sizeWL: function (width, length) {
		return {width: width, length: length};
	},
	vectorLength: function (xDelta, yDelta) {
		return Math.sqrt(
			xDelta*xDelta +
			yDelta*yDelta
		);
	},
	vectorAngle: function (xDelta, yDelta) {
		var angle = Math.atan(yDelta / xDelta);
		if(xDelta < 0) {
			angle += Math.PI;
		}
		if(angle < 0) {
			angle += 2*Math.PI;
		}
		return angle;
	},
	angleRadToDeg: function (angle) {
		return 180*(angle/Math.PI);
	},
	angleDegToRad: function (angle) {
		return Math.PI*(angle/180);
	},
	RGBToCSS: function (rgb) {
		var letters = '0123456789ABCDEF'.split(''),
			color = '#',
			R = rgb[0],
			G = rgb[1],
			B = rgb[2];
		color += letters[Math.floor(R/16)];
		color += letters[R%16];
		color += letters[Math.floor(G/16)];
		color += letters[G%16];
		color += letters[Math.floor(B/16)];
		color += letters[B%16];
		return color;
	},
	getUserId: function () {
		// copy-paste from server source
		return socket.io.id.toString().substr(0, 5);
	}
};
var socket = {
	io: undefined,
	connect: function () {
		this.io = io();
		this.io.connect();
	},
	disconnect: function () {
		if(this.io !== undefined) {
			this.io.disconnect();
			this.io = undefined;
		}
	},
	bindGame: function () {
		this.io.on('game.paint', function (packet) {
			game.paint.onPaint(packet);
		});
	}
};
var canvas = {
	element: undefined,
	context: undefined,
	renderSize: utils.sizeWH(
		NaN,
		NaN
	),
	renderOffset: utils.point(
		NaN,
		NaN
	),
	size: utils.sizeWH(
		NaN,
		NaN
	),
	init: function () {
		this.element = $("#gameCanvas");
		this.context = canvas.element[0].getContext("2d");
		canvas.resize();
		$(window).on('resize', function () {
			canvas.resize();
		});
	},
	uninit: function () {
		$(window).off('resize');
	},
	resize: function () {
// /* log */ console.log('window.resize');
		var parent = this.element.parent()[0];
		this.size.width = parent.offsetWidth;
		this.size.height = parent.offsetHeight;
		
		this.renderSize.width = this.size.width;
		this.renderSize.height = this.renderSize.width*(
			game.paintRect.height/
			game.paintRect.width
		);
		if(this.renderSize.height > this.size.height) {
			this.renderSize.height = this.size.height;
			this.renderSize.width = this.renderSize.height*(
				game.paintRect.width/
				game.paintRect.height
			);
		}
		this.element
			.attr('width', this.size.width)
			.attr('height', this.size.height);
		
		this.renderOffset.x = (
			this.size.width - 
			this.renderSize.width
		)/2;
		this.renderOffset.y = (
			this.size.height - 
			this.renderSize.height
		)/2;
		// ... + joystick.resize
	}
};
var game = {
	input: {
		accelerate: function () {
			socket.io.emit('game.control', {
					type: 'accelerate',
					rotation: controls.acceleration.rotation,
					power: controls.acceleration.power
				}
			);
		},
		rotate: function () {
			socket.io.emit('game.control', {
					type: 'rotate',
					rotation: controls.rotation
				}
			);
		},
		shot: function () {
			socket.io.emit('game.control', {
					type: 'shot'
				}
			);
		}
	},
	pointScreenToMap: function (point) {
		var ratio = this.paintRect.width/canvas.renderSize.width;
		return utils.point(
			point.x * ratio,
			point.y * ratio
		);
	},
	paintRect: undefined,
	userPosition: undefined,
	mapSize: undefined,
	paint: undefined,
	init: function (packet) {
		this.paintRect = packet.paintRect;
		this.userPosition = utils.point(
			this.paintRect.width/2,
			this.paintRect.height/2
		);
		this.backgroundColor = utils.RGBToCSS(packet.backgroundColor);
		this.mapSize = packet.mapSize;
		this.userId = utils.getUserId();
		
		this.paint = paint;
		canvas.init();
		socket.bindGame();
		controls.bind();
	},
	backgroundColor: undefined,
	userId: undefined
};
var controls = {
	acceleration: {
		power: NaN,
		rotation: NaN
	},
	rotation: NaN,
	keyboard: {
		keyPressed: {
			'W': undefined,
			'A': undefined,
			'S': undefined,
			'D': undefined
		},
		keyAcceleration: {
			'W': utils.point(0, -1),
			'A': utils.point(-1, 0),
			'S': utils.point(0, +1),
			'D': utils.point(+1, 0)
		},
		bind: function () {
			// change keyPressed[i] from `undefined` to `false`
			this.onAllKeyUp();
			$(window)
				.on('keydown', function (event) {
					controls.keyboard.onKeyDown(String.fromCharCode(event.which));
				})
				.on('keyup', function (event) {
					controls.keyboard.onKeyUp(String.fromCharCode(event.which));
				})
				.on('blur', function () {
					controls.keyboard.onAllKeyUp();
				});
		},
		unbind: function () {
			$(window)
				.off('keydown')
				.off('keyup')
				.off('blur');
		},
		onKeyDown: function (key) {
			for(var i in this.keyPressed) {
				if(i == key) {
					this.keyPressed[i] = true;
				}
			}
			this.onChange();
		},
		onKeyUp: function (key) {
			for(var i in this.keyPressed) {
				if(i == key) {
					this.keyPressed[i] = false;
				}
			}
			this.onChange();
		},
		onAllKeyUp: function () {
			// set all keys state to released
			for(var i in this.keyPressed) {
				this.keyPressed[i] = false;
			}
			this.onChange();
		},
		onChange: function () {
			var xAcceleration = 0,
				yAcceleration = 0,
				newRotation,
				newPower;
			for(var i in this.keyPressed) {
				if(this.keyPressed[i]) {
					xAcceleration += this.keyAcceleration[i].x;
					yAcceleration += this.keyAcceleration[i].y;
				}
			}
			newPower = utils.vectorLength(
				xAcceleration, 
				yAcceleration
			);
			newPower = (newPower > 0? 1 : 0);
			if(newPower != 0) {
				newRotation = utils.angleRadToDeg(
					utils.vectorAngle(
						xAcceleration,
						yAcceleration
					)
				);
			} else {
				newRotation = controls.acceleration.rotation;
			}
			if(controls.acceleration.power != newPower ||
				controls.acceleration.rotation != newRotation) {
				controls.acceleration.power = newPower;
				controls.acceleration.rotation = newRotation;
				game.input.accelerate();
			}
		}
	},
	mouse: {
		bind: function () {
			// change controls.rotation from `undefined` to `360`
			controls.rotation = 360;
			canvas.element
				.on('mousedown', function (event) {
					controls.mouse.onMove(
						utils.point(
							event.pageX,
							event.pageY
						)
					);
					controls.mouse.onDown(
						utils.point(
							event.pageX,
							event.pageY
						)
					);
				})
				.on('mousemove', function (event) {
					controls.mouse.onMove(
						utils.point(
							event.pageX,
							event.pageY
						)
					);
				});
		},
		unbind: function () {
			canvas.element
				.off('mousedown')
				.off('mousemove');
		},
		onMove: function (point) {
			if(controls.pointInRenderRect(point)) {
				this.onRotate(point);
			}
		},
		onRotate: function (point) {
			var renderPoint = utils.point(
					point.x - canvas.renderOffset.x,
					point.y - canvas.renderOffset.y
				),
				mapPoint = game.pointScreenToMap(renderPoint),
				newRotation = utils.angleRadToDeg(
					utils.vectorAngle(
						mapPoint.x - game.userPosition.x,
						mapPoint.y - game.userPosition.y
					)
				);
			if(controls.rotation != newRotation) {
				controls.rotation = newRotation;
				game.input.rotate();
			}
		},
		onDown: function (point) {
			if(controls.pointInRenderRect(point)) {
				game.input.shot();
			}
		}
	},
	pointInRenderRect: function (point) {
		return canvas.renderOffset.x <= point.x &&
			point.x <= canvas.renderOffset.x + canvas.renderSize.width &&
			canvas.renderOffset.y <= point.y &&
			point.y <= canvas.renderOffset.y + canvas.renderSize.height;
	},
	touch: {
		isAvailable: function () {
			return false;
			// touch interface is not available yet
			// return 'ontouchstart' in window; 
		},
		bind: function () {
			// touch interface is not available yet
		},
		unbind: function () {
			// touch interface is not available yet
		}
	},
	useTouch: undefined,
	bind: function () {
		useTouch = controls.touch.isAvailable();
		if(this.useTouch) {
			this.touch.bind();
		} else {
			this.mouse.bind();
			this.keyboard.bind();
		}
	},
	unbind: function () {
		if(this.useTouch) {
			this.touch.unbind();
		} else {
			this.mouse.unbind();
			this.keyboard.unbind();
		}
	}
};
var app = {
	defaultUserName: 'Anonymous',
	userName: undefined,
	menu: {
		init: function () {
			$('#userNameTextInput').val(app.defaultUserName);
			$('#menuForm').on('submit', this.onTryJoin);
		},
		show: function () {
			$('#menuModal').modal('show');
			$('#userNameTextInput').focus();
		},
		hide: function () {
			$('#menuModal').modal('hide');
		},
		onTryJoin: function () {
			app.userName = $('#userNameTextInput').val();
			if(app.userName.length == 0) {
				app.userName = app.defaultUserName;
			}
			socket.connect();
			socket.io.on('game.join.ok', app.gameJoin.ok);
			socket.io.on('game.join.fail', app.gameJoin.fail);
			socket.io.emit('game.join', {
				userName: app.userName
			});
			return false;
		}
	},
	error: {
		show: function (text) {
			$("#errorText").text(text);
			$('#errorModal').modal('show');
		}
	},
	init: function () {
		this.menu.init();
		this.menu.show();
	},
	gameJoin: {
		ok: function (packet) {
/* log */	console.log('socket.on(\''+'game.join.ok'+'\', '+JSON.stringify(packet)+')');
			app.menu.hide();
			game.init(packet);
		},
		fail: function (packet) {
/* log */	console.log('socket.on(\''+'game.join.fail'+'\', '+JSON.stringify(packet)+')');
			app.error.show(packet.reason);
		}
	}
};
$(document).ready(function () {
	app.init();
});