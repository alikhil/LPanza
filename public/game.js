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
		this.bind();
	},
	bind: function () {
		this.io.on('game.paint', function (packet) {
			game.paint.onPaint(packet);
		});
		this.io.on('game.over', function (packet) {
			app.gameOver(packet);
		});
		this.io.on('game.join.ok', app.gameJoin.ok);
		this.io.on('game.join.fail', app.gameJoin.fail);
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
		this.element = $('#gameCanvas');
		this.context = canvas.element[0].getContext('2d');
		canvas.resize();
		$(window).on('resize', function () {
			canvas.resize();
		});
	},
	uninit: function () {
		$(window).off('resize');
		this.element
			.attr('width', 0)
			.attr('height', 0);
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
		joystick.resize();
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
		controls.bind();
	},
	uninit: function () {
		controls.unbind();
		canvas.uninit();
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
			return 'ontouchstart' in window;
		},
		bind: function () {
			joystick.init();
			this.wasInRender = false;
			this.wasInJoystick = false;
			canvas.element
				.on('touchstart touchmove', function (event) {
					controls.touch.onMove(event);
				})
				.on('touchend touchcancel', function (event) {
					controls.touch.onEnd(event);
				});
		},
		unbind: function () {
			canvas.element
				.off('touchstart touchmove')
				.off('touchend touchcancel');
		},
		onMove: function (event) {
			var touches = event.originalEvent.changedTouches,
				inJoystickFound,
				inRenderFound,
				point;
			inJoystickFound = false;
			inRenderFound = false;
			for(i = 0;
				i < touches.length && (
					!inJoystickFound ||
					!inRenderFound
				);
				i ++) {
				point = utils.point(
					touches[i].pageX,
					touches[i].pageY
				);
				if(joystick.pointInJoystick(point)) {
					if(!inJoystickFound) {
						joystick.ontouch(
							utils.point(
								point.x - joystick.center.x,
								point.y - joystick.center.y
							)
						);
						inJoystickFound = true;
						this.wasInJoystick = true;
					}
				} else {
					if(controls.pointInRenderRect(point)) {
						if(!inRenderFound) {
							controls.mouse.onRotate(point);
							if(!this.wasInRender) {
								game.input.shot();
							}
							inRenderFound = true;
							this.wasInRender = true;
						}
					}
				}
			}
			if(!inJoystickFound && this.wasInJoystick) {
				joystick.untouch();
				this.wasInJoystick = false;
			}
			if(!inRenderFound && this.wasInRender) {
				this.wasInRender = false;
			}
			event.preventDefault();
		},
		wasInRender: undefined,
		wasInJoystick: undefined,
		onEnd: function (event) {
			if(this.wasInJoystick) {
				joystick.untouch();
			}
			this.wasInJoystick = false;
			this.wasInRender = false;
		}
	},
	useTouch: undefined,
	bind: function () {
		this.useTouch = controls.touch.isAvailable();
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
var joystick = {
	init: function () {
	},
	resize: function () {
		var minDimension = Math.min(
				canvas.size.height,
				canvas.size.width
			);
		if(minDimension > 400) {
			this.radius.inner = 40;
			this.radius.outer = 100;
		} else {
			this.radius.inner = 26;
			this.radius.outer = 64;
		}
		this.center.x = this.margin +
			this.radius.outer;
		this.center.y = canvas.size.height -
			this.margin -
			this.radius.outer;
	},
	center: utils.point(
		NaN,
		NaN
	),
	radius: {
		outer: NaN,
		inner: NaN
	},
	activeAngle: 45,
	margin: 10,
	currentTouchRadius: NaN,
	ontouch: function (point) {
		var radius = this.currentTouchRadius;
		if(radius < this.radius.inner || this.radius.outer < radius) {
			this.untouch();
		} else {
			this.touch(point);
		}
	},
	touch: function (point) {
		var newRotation,
			newPower;
		if(point.x == 0 && point.y == 0) {
			newPower = 0;
			newRotation = controls.acceleration.rotation;
		} else {
			newRotation = Math.floor(
				(utils.angleRadToDeg(
					utils.vectorAngle(
						point.x,
						point.y
					)
				) + 45/2)/45
			)*45;
			/*newRotation = utils.angleRadToDeg(
				utils.vectorAngle(
					point.x,
					point.y
				)
			);*/
			newPower = 1;
		}
		if(controls.acceleration.power != newPower ||
			controls.acceleration.rotation != newRotation) {
			controls.acceleration.power = newPower;
			controls.acceleration.rotation = newRotation;
			game.input.accelerate();
		}
	},
	untouch: function () {
		this.touch(
			utils.point(
				0,
				0
			)
		);
	},
	pointInJoystick: function (point) {
		this.currentTouchRadius = utils.vectorLength(
				point.x - this.center.x,
				point.y - this.center.y
			);
		return this.currentTouchRadius <
			this.margin +
				this.radius.outer;
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
			socket.io.emit('game.join', {
				userName: app.userName
			});
			return false;
		}
	},
	error: {
		show: function (text) {
			$('#errorText').text(text);
			$('#errorModal').modal('show');
		}
	},
	feedback: {
		init: function () {
			this.hide();
			$('#feedbackMessageText').val('Уважаемые разработчики,\nпишу к вам ');
			$('#feedbackForm').on('submit', function () {
				app.feedback.send(
					$('#feedbackEmailText').val(),
					$('#feedbackMessageText').val()
				);
				return false;
			});
			$('#feedbackBackButton').on('click', this.hide);
			$('#feedbackLink').on('click', this.show);
			this.status.init();
			socket.io.on('game.feedback.ok', this.result.ok);
			socket.io.on('game.feedback.fail', this.result.fail);
		},
		status: {
			show: function (success, text) {
				if(success) {
					$('#feedbackStatus')
						.removeClass('alert-danger')
						.addClass('alert-success');
				} else {
					$('#feedbackStatus')
						.removeClass('alert-success')
						.addClass('alert-danger');
				}
				$('#feedbackStatusText')
					.text(text);
				$('#feedbackStatus')
					.show();
			},
			hide: function () {
				$('#feedbackStatus')
					.hide();
			},
			init: function () {
				$('#feedbackStatusClose').on('click', function () {
					app.feedback.status.hide();
				});
				this.hide();
			}
		},
		show: function () {
			$('#menuForm').hide();
			$('#feedbackForm').show();
			$('#feedbackLink').hide();
			$('#feedbackEmailText').focus();
		},
		hide: function () {
			$('#menuForm').show();
			$('#feedbackForm').hide();
			$('#feedbackLink').show();
			$('#userNameTextInput').focus();
		},
		send: function (email, message) {
			socket.io.emit('game.feedback', {
				email: email,
				message: message
			});
		},
		result: {
			ok: function (packet) {
				app.feedback.status.show(true, app.feedback.successText);
				$('#feedbackMessageText').val('Уважаемые разработчики,\nпишу к вам ');
			},
			fail: function (packet) {
				app.feedback.status.show(false, packet.reason);
			}
		},
		successText: 'Ваше сообщение отправлено'
	},
	score: {
		show: function (score) {
			$('#scoreText').text(score);
			$('#scoreModal').modal('show');
			$('#scoreModal').on('hide.bs.modal', function () {
				app.menu.show();
			});
		}
	},
	init: function () {
		socket.connect();
		this.menu.init();
		this.feedback.init();
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
	},
	gameOver: function (packet) {
/* log */	console.log('socket.on(\''+'game.over'+'\', '+JSON.stringify(packet)+')');
		game.uninit();
		this.score.show(packet.score);
	}
};
$(document).ready(function () {
	var canvas2DSupported = !!window.CanvasRenderingContext2D;
	if(!canvas2DSupported) {
		$('#bad_browser').show();
	} else {
		$('#canvasWrap').show();
		$('#browser_check').hide();
		app.init();
	}
});