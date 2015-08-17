var utils = {
	point: function (x, y) {
		return {x: x, y: y};
	},
	sizeWH: function (width, height) {
		return {width: width, height: height};
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
	},
	CSSPrefixes: function (property, value) {
		var prefixes = ['', '-ms-', '-webkit-', '-moz-', '-o-'], t = {};
		for (var i = 0; i < prefixes.length; i ++) {
			t[prefixes[i] + property] = value;
		}
		return t;
	}
};
var socket = {
	io: undefined,
	disconnected: false,
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
			socket.disconnected = true;
			if(game.inProgress) {
				if (online.visible) {
					online.hide ();
				}
				app.error.allowDismiss (true);
				app.error.onhide (function () {
					app.error.onhide (function () {});
					app.gameOver ({
						score: paint.userScore
					});
					app.error.allowDismiss (false);
				});
			} else {
				app.error.allowDismiss (false);
				if (!app.score.visible) {
					$('#menuModal').modal ('hide');
				}
			}
			if (!app.score.visible) {
				app.error.show(
					'error.disconnect_title',
					'error.disconnect_text'
				);
			}
		});
		this.io.on ('connect', function () {
			socket.disconnected = false;
			if (!game.inProgress && !app.score.visible) {
				app.error.hide ();
				$('#menuModal').modal ('show');
				app.error.allowDismiss (true);
			}
		});
		this.io.on('room.list', function (packet) {
			app.updateRooms (packet.rooms);
		});
	}
};
var canvas = {
	element: undefined,
	layers: {
		ground: undefined,
		tank: undefined,
		bullet: undefined,
		turret: undefined,
		label: undefined,
		joystick: undefined
	},
	renderSize: utils.sizeWH(
		NaN,
		NaN
	),
	renderOffset: utils.point(
		NaN,
		NaN
	),
	screenSize: utils.sizeWH(
		NaN,
		NaN
	),
	renderVisibleSize: utils.sizeWH(
		NaN,
		NaN
	),
	renderCropSize: utils.sizeWH(
		NaN,
		NaN
	),
	init: function () {
		this.element = $('#gameCanvas');
		for (var i in this.layers) {
			this.layers[i] = $('#layer_' + i);
			this.layers[i].empty ();
		}
		this.resize ();
		$(window).on('resize', function () {
			canvas.resize();
		});
		window.setTimeout(function () {
			scrollToTop();
			canvas.resize();
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
		this.screenSize.width = parent.offsetWidth;
		this.screenSize.height = parent.offsetHeight;
		
		this.renderSize.width = game.paintRect.width;
		this.renderSize.height = game.paintRect.width;
		if (this.screenSize.width / this.screenSize.height >
				this.renderSize.width / this.renderSize.height) {
			this.scale = this.renderSize.width / this.screenSize.width;
			this.renderOffset.x = 0;
			this.renderOffset.y = (
				this.screenSize.height -
				this.renderSize.height / this.scale
			)/2;
		} else {
			this.scale = this.renderSize.height / this.screenSize.height;
			this.renderOffset.x = (
				this.screenSize.width -
				this.renderSize.width / this.scale
			)/2;
			this.renderOffset.y = 0;
		}
			this.scale = 1/this.scale;
		this.element
			.attr('width', this.renderSize.width)
			.attr('height', this.renderSize.height)
		$('#gameTouchSurface').add (this.element)
			.css (utils.CSSPrefixes (
				'transform',
				'scale' + '(' +
					this.scale + ',' +
					this.scale + ')'
			))
			.css (utils.CSSPrefixes (
				'transform-origin',
				'0px 0px'
			));
		this.element
			.css ('margin-top', this.renderOffset.y)
			.css ('margin-left', this.renderOffset.x);
		$('#gameTouchSurface').css ({
			'width': this.renderSize.width,
			'height': this.renderSize.height,
			'left': this.renderOffset.x,
			'top': this.renderOffset.y
		});
		paint.updateFonts (this.scale);
		this.renderVisibleSize =
			utils.sizeWH (
				canvas.screenSize.width / canvas.scale,
				canvas.screenSize.height / canvas.scale
			);
		this.renderCropSize =
			utils.sizeWH (
				game.paintRect.width - canvas.renderVisibleSize.width,
				game.paintRect.height - canvas.renderVisibleSize.height
			);
	},
	pointScreenToRender: function (x, y) {
		return utils.point(
			x - this.renderOffset.x,
			y - this.renderOffset.y
		);
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
		var scale = 1 / canvas.scale;
		return utils.point(
			point.x * scale,
			point.y * scale
		);
	},
	paintRect: undefined,
	tankCenter: undefined,
	lastTankCenter: undefined,
	mapSize: undefined,
	paint: undefined,
	mayShot: undefined,
	init: function (packet) {
		this.paintRect = packet.paintRect;
		this.lastTankCenter = utils.point(0, 0);
		this.tankCenter = utils.point(0, 0);
		this.backgroundColor = utils.RGBToCSS(packet.backgroundColor);
		this.mapSize = packet.mapSize;
		
		language.setDOM (
			'#gameRoomIdText',
			'game.room_id', {
				'%id%': app.roomId
			}
		);
		this.inProgress = true;
		this.mayShot = false;
		this.paint = paint;
		paint.joystickDrawn = false;
		canvas.init();
		controls.bind();
		models.loadModels(packet.models);
		ping.init();
		online.reset ();
		rating.init();
		$('.gameOverlay').show();
	},
	uninit: function () {
		this.inProgress = false;
		controls.unbind();
		paint.reset ();
		canvas.uninit();
		ping.uninit();
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
				language.setDOM (
					'#gameStatsPing',
					'game.stats_ping', {
						'%time%': '' + (curTime - oldTime)
					}
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
		language.on ('change', function () {
			rating.updateList ();
			resizeOnlineButtonPadding ();
		});
	},
	uninit: function () {
		this.users.splice(0, this.users.length);
		language.off ('change');
	},
	refresh: function (packet) {
		this.users.splice(0, this.users.length);
		this.users = packet.users;
		this.updateList ();
		resizeOnlineButtonPadding ();
	},
	updateList: function () {
		var element = $('#gameStatsRatingList')
		element.empty();
		for(var i = 0; i < this.users.length; i ++) {
			element.append(
				$('<li>')
					.text(
						language.expand (
							'game.rating_element', {
								'%order%': '' + (i + 1),
								'%score%': '' + this.users[i].score,
								'%name%': this.users[i].userName
							}
						)
					)
			);
		}
	}
};
var online = {
	count: undefined,
	users: [],
	init: function () {
		this.hide ();
		$('#onlineListBackButton').on('click', this.hide);
		$('#gameStatsOnlineButton').on('click', this.show);
		language.on ('change', function () {
			online.updateList ();
		});
	},
	reset: function () {
		this.users.splice(0, this.users.length);
		$('#gameStatsOnlineCount').text('?');
		this.visible = false;
	},
	refresh: function (packet) {
		this.users.splice(0, this.users.length);
		this.users = packet.users;
		this.count = this.users.length;
		$('#gameStatsOnlineCount').text(this.count);
		resizeOnlineButtonPadding ();
		if (this.visible) {
			this.updateList ();
		}
	},
	updateList: function () {
		var element = $('#onlineList');
		$('#label_online_list_count').text (this.count);
		element.empty ();
		for (var i = 0; i < this.users.length; i ++) {
			element.append (
				$('<li>')
					.text (
						language.expand (
							'game.online_element', {
								'%name%': this.users[i]
							}
						)
					)
					.addClass ('list-group-item')
			);
		}
	},
	visible: undefined,
	show: function (score) {
		$('#onlineListForm').show ();
		$('#menuModal').modal('show');
		online.visible = true;
		online.updateList ();
	},
	hide: function () {
		$('#onlineListForm').hide ();
		$('#menuModal').modal('hide');
		online.visible = false;
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
	wantSingleShot: undefined,
	clickListeningElements: undefined,
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
					controls.wantShot = controls.mouse.buttonDown = false;
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
		buttonDown: undefined,
		wasInRender: undefined,
		lastPosition: utils.point (0, 0),
		bind: function () {
			// change controls.rotation from `undefined` to `360`
			controls.rotation = 360;
			controls.turretCenter = utils.point(0, 0);
			this.wasInRender = false;
			controls.wantShot = false;
			controls.wantSingleShot = false;
			this.buttonDown = false;
			controls.clickListeningElements
				.on('mousedown', function (event) {
					controls.mouse.buttonDown = true;
					controls.mouse.onMove(
						canvas.pointScreenToRender (
							event.pageX,
							event.pageY
						)
					);
				})
				.on('mousemove', function (event) {
					controls.mouse.buttonDown =
						controls.mouse.buttonDown ||
						event.originalEvent.buttons != 0;
					controls.mouse.onMove(
						canvas.pointScreenToRender (
							event.pageX,
							event.pageY
						)
					);
				})
				.on('mouseup mouseleave', function (event) {
					controls.mouse.buttonDown = false;
					controls.mouse.onMove(
						canvas.pointScreenToRender (
							event.pageX,
							event.pageY
						)
					);
				});
		},
		unbind: function () {
			controls.clickListeningElements
				.off('mousedown mousemove mouseup');
		},
		onMove: function (point) {
			this.lastPosition = point;
			if(controls.pointInRenderRect(point)) {
				controls.wantShot = controls.mouse.buttonDown;
				this.onRotate(point);
				if (!this.wasInRender) {
					this.wasInRender = true;
				}
			} else {
				controls.wantShot = false;
				if (this.wasInRender) {
					this.wasInRender = false;
				}
			}
		},
		onRotate: function (point) {
			var renderPoint = utils.point(
					point.x,
					point.y
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
		return true;
	},
	touch: {
		touches: {current: {}, first: {}, length: 0},
		isAvailable: function () {
			return 'ontouchstart' in window;
		},
		bind: function () {
			swipe.init ();
			controls.clickListeningElements
				.on('touchstart', function (event) {
					var e = event.originalEvent,
						changed = e.changedTouches,
						t, id;
					for (var i = 0; i < changed.length; i ++) {
						t = changed[i];
						id = t.identifier;
						if (controls.touch.touches.length < 2) {
							controls.touch.touches.current[id] =
								canvas.pointScreenToRender (
									t.pageX,
									t.pageY
								);
							controls.touch.touches.first[id] =
								canvas.pointScreenToRender (
									t.pageX,
									t.pageY
								);
							controls.touch.touches.length ++;
							swipe.on.newDown (id);
						}
					}
					event.preventDefault();
				})
				.on('touchmove', function (event) {
					var e = event.originalEvent,
						changed = e.changedTouches,
						t, id;
					for (var i = 0; i < changed.length; i ++) {
						t = changed[i];
						id = t.identifier;
						if (id in controls.touch.touches.current) {
							controls.touch.touches.current[id] =
								canvas.pointScreenToRender (
									t.pageX,
									t.pageY
								);
							swipe.on.move (id);
						}
					}
					event.preventDefault();
				})
				.on('touchend', function (event) {
					var e = event.originalEvent,
						changed = e.changedTouches,
						t, id;
					for (var i = 0; i < changed.length; i ++) {
						t = changed[i];
						id = t.identifier;
						if (id in controls.touch.touches.current) {
							delete controls.touch.touches.current[id];
							delete controls.touch.touches.first[id];
							controls.touch.touches.length --;
							if (id === swipe.joy) {
								swipe.on.joyUp ();
							}
							if (id === swipe.aim) {
								swipe.on.aimUp ();
							}
						}
					}
					event.preventDefault();
				})
				.on('touchcancel', function (event) {
					for (var i in controls.touch.touches.current) {
						delete controls.touch.touches.current[i];
						delete controls.touch.touches.first[i];
						controls.touch.touches.length --;
					}
					swipe.on.joyUp ();
					swipe.on.aimUp ();
					event.preventDefault();
				});
		},
		unbind: function () {
			controls.clickListeningElements
				.off('touchstart touchmove touchend touchcancel');
		}
	},
	useTouch: undefined,
	bind: function () {
		this.clickListeningElements = $('#gameTouchSurface');
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
	},
	tankCenterMove: function () {
		if (this.useTouch) {
			if (swipe.aim !== undefined) {
				swipe.on.move (swipe.aim);
			}
		} else {
			this.mouse.onMove (this.mouse.lastPosition);
		}
	}
};
function resizeOnlineButtonPadding () {
	var button = $('#gameStatsOnlineButton'),
		list = $('#gameStatsRatingList'),
		listContainer = $('#gameStatsRating'),
		buttonContainer = $('#gameStatsOnlineButton_element'),
		buttonPlaceholder = $('#gameStatsOnlineButton_placeholder'),
		contentWidth = Math.max (
			list[0].offsetWidth,
			button[0].offsetWidth
		);
	buttonPlaceholder
		.width (contentWidth)
		.height (button[0].offsetHeight);
	if (list[0].offsetWidth > button[0].offsetWidth) {
		buttonContainer
			.css (
				'margin-right',
				(list[0].offsetWidth - button[0].offsetWidth) / 2
			);
	}
}
var swipe = {
	aimIs: undefined,
	joyIs: false,
	aimFix: undefined,
	joy: undefined,
	aim: undefined,
	threshold: 15,
	init: function () {
		this.aimIs = false;
		this.joyIs = false;
		this.aimFix = false;
		this.joy = undefined;
		this.aim = undefined;
	},
	on: {
		aimUp: function () { // af -> e, a -> e, bf -> jf
			swipe.aimIs = swipe.aimFix = false;
			swipe.aim = undefined;
			swipe.shot ();
		},
		joyUp: function () { // jf -> e, bf -> af
			swipe.joyIs = false;
			swipe.joy = undefined;
			swipe.drive (utils.point (0, 0));
		},
		newDown: function (id) {
			if (swipe.aimIs) { // a, af, bf
				if (swipe.aimFix) { // af -> bf, bf
					swipe.joy = id;
					swipe.joyIs = true;
				} else { // a -> bf
					swipe.joy = swipe.aim;
					swipe.joyIs = true;
					swipe.aim = id;
					swipe.aimFix = true;
				}
			} else { // e -> a, jf -> bf
				swipe.aim = id;
				swipe.aimIs = true;
				if (swipe.joyIs) { // jf -> bf
					swipe.aimFix = true;
				}
				swipe.rotate (controls.touch.touches.current[id]);
			}
		},
		move: function (id) {
			var a = controls.touch.touches.first[id],
				b = controls.touch.touches.current[id],
				dx = b.x - a.x,
				dy = b.y - a.y,
				d;
			if (id == swipe.aim) { // aimIs: a, af, bf
				if (!swipe.aimFix) { // a
					d = utils.vectorLength (dx, dy)
					if (d > swipe.threshold) { // a -> jf
						swipe.joy = swipe.aim;
						swipe.joyIs = true;
						swipe.aim = undefined;
						swipe.aimIs = swipe.aimFix = false;
					}
				}
				if (swipe.aimIs) { // not aim -> joy, aim touch
					swipe.rotate (utils.point (
						b.x,
						b.y
					));
				}
			}
			if (id == swipe.joy) { // joy touch
				swipe.drive ( utils.point (dx, dy));
			}
		}
	},
	drive: function (point) {
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
			newPower = 1;
		}
		if(controls.acceleration.power != newPower ||
			controls.acceleration.rotation != newRotation) {
			controls.acceleration.power = newPower;
			controls.acceleration.rotation = newRotation;
			game.input.accelerate();
		}
	},
	rotate: function (point) {
		controls.mouse.onRotate(point);
	},
	shot: function () {
		controls.wantSingleShot = true;
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
			this.hide();
		},
		show: function () {
			$('#menuForm').show ();
			$('#menuModal').modal('show');
			if (!controls.touch.isAvailable ()) {
				$('#userNameTextInput').focus();
			}
			if (socket.disconnected) {
				$('#menuModal').modal ('hide');
				app.error.show(
					'error.disconnect_title',
					'error.disconnect_text'
				);
			}
		},
		hide: function () {
			$('#menuForm').hide ();
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
				text: language.expand (
						'menu.room_element', {
							'%id%': rooms[i].id,
							'%total%': rooms[i].total,
							'%used%': rooms[i].used
						}
					)
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
			var data = {};
			if(text === 'error.join_fail_text.name_too_long') {
				data['%count%'] = '' + app.maxUserNameLength;
			}
			language.setDOM('#errorTitle', title);
			language.setDOM('#errorText', text, data);
			$('#errorModal').modal('show');
		},
		hide: function () {
			$('#errorModal').modal ('hide');
		},
		allowDismiss: function (allow) {
			if (allow) {
				$('#errorDismissButton').show ();
			} else {
				$('#errorDismissButton').hide ();
			}
		},
		onhide: function (callback) {
			$('#errorModal').on ('hide.bs.modal', callback);
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
			$('#feedbackShowButton').on('click', this.show);
		},
		show: function () {
			app.menu.hide ();
			$('#feedbackForm').show();
			$('#menuModal').modal('show');
		},
		hide: function () {
			$('#feedbackForm').hide();
			$('#menuModal').modal('hide');
			app.menu.show ();
		}
	},
	score: {
		visible: false,
		score: 0,
		init: function () {
			this.hide();
			$('#playAgainButton').on('click', this.hide);
			language.on ('change', this.addShareButtons);
		},
		addShareButtons: function () {
			var holder = $('#scoreShareButtons');
			holder.empty ();
			Share (
				holder,
				'http://lpanza.ru',
				language.get ('share.score_title'),
				language.expand (
					'share.score_text', {
						'%score%': app.score.score
					}
				),
				'http://lpanza.ru/logo.opengraph.png'
			);
		},
		show: function (score) {
			this.score = score;
			$('#scoreText').text(score);
			$('#gameOverForm').show ();
			$('#menuModal').modal('show');
			this.addShareButtons ();
			this.visible = true;
		},
		hide: function () {
			$('#gameOverForm').hide ();
			$('#menuModal').modal('hide');
			app.menu.show();
			app.score.visible = false;
		}
	},
	init: function () {
		socket.connect();
		this.menu.init();
		this.feedback.init();
		this.score.init ();
		online.init ();
		this.menu.show();
		tabActiveMonitor.init();
		sound.load ();
		sound.mute (true);
		$('#mute_checkbox').on ('change', function () {
			sound.mute (this.checked);
		});
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
		if(game.inProgress) {
			game.uninit ();
			if (online.visible) {
				online.hide ();
			}
			this.score.show (packet.score);
		}
	}
};
$(document).ready(function () {
	var canvas2DSupported = !!window.CanvasRenderingContext2D;
	language.init ();
	if(!canvas2DSupported) {
		$('#bad_browser').show();
	} else {
		$('.gameOverlay').hide();
		$('#canvasWrap').show();
		$('#browser_check').hide();
		app.init();
	}
});