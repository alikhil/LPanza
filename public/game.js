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
	moveVector: function (rotation, distance) {
		var yNew = Math.sin(rotation) * distance,
			xNew = Math.cos(rotation) * distance;
		return utils.point(xNew, yNew);
	},
	addVector: function (aVector, bVector) {
		return utils.point(
			bVector.x + aVector.x,
			bVector.y + aVector.y
		);
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
		/*
		this.io.on('game.feedback.ok', app.feedback.result.ok);
		this.io.on('game.feedback.fail', app.feedback.result.fail);
		*/
		this.io.on('game.ping', function (packet) {
			ping.pong(packet);
		});
		this.io.on('game.online', function (packet) {
			online.refresh(packet);
		});
		this.io.on('game.rating', function (packet) {
			rating.refresh(packet);
		});
		this.io.on('disconnect', function () {
			if(game.inProgress) {
				$('#errorDismissButton').hide();
			}
			app.error.show(
				'error.disconnect_title',
				'error.disconnect_text'
			);
		});
		this.io.on('room.list', function (packet) {
			app.updateRooms (packet.rooms);
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
		this.element = $('#gameCanvas');
		this.context = canvas.element[0].getContext('2d');
		canvas.resize();
		$(window).on('resize', function () {
			canvas.resize();
		});
		window.setTimeout(function () {
			scrollToTop();
			canvas.resize();
			paint.repaint();
		}, 250);
	},
	uninit: function () {
		$(window).off('resize');
		this.element
			.attr('width', 0)
			.attr('height', 0);
	},
	resize: function () {
// /* log */ console.log('window.resize');
		var parentElement = this.element.parent(),
			parent = parentElement[0],
			screenSizeHackElement = $('#screenSizeHack')[0];
		scrollToTop();
		parentElement
			.width(screenSizeHackElement.offsetLeft + 1)
			.height(screenSizeHackElement.offsetTop + 1);
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
function scrollToTop () {
	$(window).scrollTop(0);
}
var game = {
	inProgress: false,
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
	tankCenter: undefined,
	mapSize: undefined,
	paint: undefined,
	mayShot: undefined,
	init: function (packet) {
		this.paintRect = packet.paintRect;
		this.tankCenter = utils.point(
			this.paintRect.width/2,
			this.paintRect.height/2
		);
		this.backgroundColor = utils.RGBToCSS(packet.backgroundColor);
		this.mapSize = packet.mapSize;
		
		$('#gameRoomIdText').text(
			language.get('game.room_id')
				.replace('%id%', app.roomId)
		);
		this.inProgress = true;
		this.mayShot = false;
		this.paint = paint;
		canvas.init();
		controls.bind();
		models.loadModels(packet.models);
		ping.init();
		online.init();
		rating.init();
		$('.gameOverlay').show();
	},
	uninit: function () {
		this.inProgress = false;
		controls.unbind();
		canvas.uninit();
		ping.uninit();
		online.uninit();
		rating.uninit();
		$('.gameOverlay').hide();
	},
	backgroundColor: undefined
};
var ping = {
	init: function () {
		this.timer = window.setInterval(function () {
				ping.ping();
			},
			this.delay
		);
		ping.ping();
	},
	uninit: function () {
		window.clearInterval(this.timer);
		this.requests.splice(0, this.requests.length);
	},
	ping: function () {
		var curTime = (new Date()).getTime();
		this.requests.push(curTime);
		socket.io.emit('game.ping', {time: curTime});
	},
	pong: function (packet) {
		var curTime = (new Date()).getTime(),
			oldTime = packet.time;
		for(var i = 0; i < this.requests.length; i ++) {
			if(this.requests[i] == oldTime) {
				$('#gameStatsPing').text(
					language.get('game.stats_ping').replace(
						'%time%',
						'' + (curTime - oldTime)
					)
				);
				this.requests.splice(0, i + 1);
			}
		}
	},
	timer: undefined,
	delay: 10*1000,
	requests: []
};
var rating = {
	users: [],
	init: function () {
		$('#gameStatsRatingList').empty();
	},
	uninit: function () {
		this.users.splice(0, this.users.length);
	},
	refresh: function (packet) {
		this.users.splice(0, this.users.length);
		this.users = packet.users;
		$('#gameStatsRatingList').empty();
		for(var i = 0; i < this.users.length; i ++) {
			$('#gameStatsRatingList').append(
				$('<li>')
					.text(
						language.get('game.rating_element')
							.replace('%order%', '' + (i + 1))
							.replace('%score%', '' + this.users[i].score)
							.replace('%name%', this.users[i].userName)
					)
			);
		}
	}
};
var online = {
	count: undefined,
	users: [],
	init: function () {
		$('#gameStatsOnlineCount').text('?');
	},
	uninit: function () {
		this.users.splice(0, this.users.length);
	},
	refresh: function (packet) {
		this.users.splice(0, this.users.length);
		this.users = packet.users;
		this.count = this.users.length;
		$('#gameStatsOnlineCount').text(this.count);
	}
};
var controls = {
	acceleration: {
		power: NaN,
		rotation: NaN
	},
	rotation: NaN,
	turretCenter: undefined,
	wantShot: undefined,
	mouseButtonDown: undefined,
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
		wasInRender: undefined,
		cursorAimAllowed: undefined,
		bind: function () {
			// change controls.rotation from `undefined` to `360`
			controls.rotation = 360;
			controls.turretCenter = utils.point(0, 0);
			this.wasInRender = false;
			controls.wantShot = false;
			controls.mouseButtonDown = false;
			this.cursorAimAllowed = $('.cursor_aim_allowed');
			$(window)
				.on('mousedown', function (event) {
					controls.mouseButtonDown = true;
					controls.mouse.onMove(
						utils.point(
							event.pageX,
							event.pageY
						)
					);
				})
				.on('mousemove', function (event) {
					controls.mouseButtonDown =
						controls.mouseButtonDown ||
						event.which != 0;
					controls.mouse.onMove(
						utils.point(
							event.pageX,
							event.pageY
						)
					);
				})
				.on('mouseup', function (event) {
					controls.mouseButtonDown = false;
					controls.mouse.onMove(
						utils.point(
							event.pageX,
							event.pageY
						)
					);
				});
		},
		unbind: function () {
			$(window)
				.off('mousedown')
				.off('mousemove');
		},
		onMove: function (point) {
			if(controls.pointInRenderRect(point)) {
				controls.wantShot = controls.mouseButtonDown;
				this.onRotate(point);
				if (!this.wasInRender) {
					this.cursorAimAllowed.addClass ('cursor_aim');
					this.wasInRender = true;
				}
			} else {
				controls.wantShot = false;
				if (this.wasInRender) {
					this.cursorAimAllowed.removeClass ('cursor_aim');
					this.wasInRender = false;
				}
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
						mapPoint.x - controls.turretCenter.x,
						mapPoint.y - controls.turretCenter.y
					)
				);
			if(controls.rotation != newRotation) {
				controls.rotation = newRotation;
				game.input.rotate();
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
			controls.rotation = 360;
			controls.turretCenter = utils.point(0, 0);
			this.wasInRender = false;
			this.wasInJoystick = false;
			controls.wantShot = false;
			controls.mouseButtonDown = false;
			$(window)
				.on('touchstart touchmove', function (event) {
					controls.touch.onMove(event);
				})
				.on('touchend touchcancel', function (event) {
					controls.touch.onEnd(event);
				});
		},
		unbind: function () {
			$(window)
				.off('touchstart touchmove')
				.off('touchend touchcancel');
		},
		onMove: function (event) {
			var touches = event.originalEvent.changedTouches,
				inJoystickFound,
				inRenderFound,
				point;
			controls.mouseButtonDown = true;
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
							controls.wantShot = controls.mouseButtonDown;
							controls.mouse.onRotate(point);
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
				controls.wantShot = false;
			}
			event.preventDefault();
		},
		wasInRender: undefined,
		wasInJoystick: undefined,
		onEnd: function (event) {
			controls.mouseButtonDown = false;
			controls.wantShot = false;
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
var tabActiveMonitor = {
	stateKey: undefined,
	eventKey: undefined,
	init: function () {
		var keys = {
				hidden: 'visibilitychange',
				webkitHidden: 'webkitvisibilitychange',
				mozHidden: 'mozvisibilitychange',
				msHidden: 'msvisibilitychange'
			};
		for (this.stateKey in keys) {
			if (this.stateKey in document) {
				this.eventKey = keys[this.stateKey];
				break;
			}
		}
		this.update();
		$(document).on(this.eventKey, this.update);
	},
	update: function () {
		app.isTabActive = !document[tabActiveMonitor.stateKey];
	}
};
var app = {
	isTabActive: undefined,
	userName: undefined,
	maxUserNameLength: 20,
	roomId: undefined,
	menu: {
		init: function () {
			app.updateRooms ([]);
			$('#userNameTextInput').attr('maxlength', app.maxUserNameLength);
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
			app.roomId = $('#roomSelect').val();
			app.userName = $('#userNameTextInput').val().trim();
			if(app.userName.length > 0) {
				if(app.userName.length > app.maxUserNameLength) {
					$('#userNameTextInput').val(
						app.userName.substr(0, app.maxUserNameLength)
					);
					app.error.show(
						'game.join_fail_title',
						'error.join_fail_text.name_too_long'
					);
				} else {
					socket.io.emit('game.join', {
						userName: app.userName,
						roomId: app.roomId
					});
				}
			} else {
				app.error.show(
					'game.join_fail_title',
					'error.join_fail_text.name_empty'
				);
			}
			return false;
		}
	},
	updateRooms: function (rooms) {
		var select = $('#roomSelect'),
			sorted = [],
			full = [],
			room,
			isFull,
			lastRoom = select.val(),
			lastRoomStillPresent = false;
		for (var i = 0; i < rooms.length; i ++) {
			isFull = rooms[i].total <= rooms[i].used;
			room = {
				val: rooms[i].id,
				text: language.get('menu.room_element')
					.replace ('%id%', rooms[i].id)
					.replace ('%total%', rooms[i].total)
					.replace ('%used%', rooms[i].used)
			};
			lastRoomStillPresent =
				lastRoomStillPresent ||
				lastRoom == rooms[i].id;
			if (isFull) {
				lastRoomStillPresent =
					lastRoomStillPresent &&
					lastRoom != rooms[i].id;
				full.push (room);
			} else {
				sorted.push (room);
			}
		}
		sorted = sorted.concat (full);
		select.empty();
		for (var i = 0; i < sorted.length; i ++) {
			select.append (
				'<option value=' + sorted[i].val + '>' +
					sorted[i].text +
					'</option>'
			);
		}
		if (sorted.length > 0) {
			if (!lastRoomStillPresent) {
				lastRoom = sorted[0].val;
			}
			select.val(lastRoom);
		}
	},
	error: {
		show: function (title, text) {
			var error = language.get(text);
			if(text === 'error.join_fail_text.name_too_long') {
				error = error.replace(
					'%count%',
					'' + app.maxUserNameLength
				);
			}
			language.setDOM('#errorTitle', title);
			language.setDOM('#errorText', text);
			$('#errorModal').modal('show');
		}
	},
	/*
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
	*/
	feedback: {
		init: function () {
			this.hide();
			$('#feedbackBackButton').on('click', this.hide);
			$('#feedbackLink').on('click', this.show);
		},
		show: function () {
			$('#menuForm').hide();
			$('#feedbackForm').show();
			$('#feedbackLink').hide();
		},
		hide: function () {
			$('#feedbackForm').hide();
			$('#feedbackLink').show();
			$('#menuForm').show();
			$('#userNameTextInput').focus();
		}
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
		tabActiveMonitor.init();
	},
	gameJoin: {
		ok: function (packet) {
/* log */	console.log('socket.on(\''+'game.join.ok'+'\', '+JSON.stringify(packet)+')');
			app.menu.hide();
			game.init(packet);
		},
		fail: function (packet) {
/* log */	console.log('socket.on(\''+'game.join.fail'+'\', '+JSON.stringify(packet)+')');
			var reason = packet.reason;
			app.error.show(
				'game.join_fail_title',
				reason
			);
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
		$('.gameOverlay').hide();
		$('#canvasWrap').show();
		$('#browser_check').hide();
		language.init();
		app.init();
	}
});