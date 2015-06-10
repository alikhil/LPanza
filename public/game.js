$(document).ready(function () {
	var socket = undefined;
	var canvas = {
		element: undefined,
		context: undefined,
		width: NaN,
		height: NaN,
		heightParentPercent: 90,
		widthParentPercent: 90,
		RGBToCSS: function (R, G, B) {
			var letters = '0123456789ABCDEF'.split('');
			var color = '#';
			color += letters[Math.floor(R/16)];
			color += letters[R%16];
			color += letters[Math.floor(G/16)];
			color += letters[G%16];
			color += letters[Math.floor(B/16)];
			color += letters[B%16];
			return color;
		},
		init: function () {
			canvas.element = $("#gameCanvas");
			canvas.context = canvas.element[0].getContext("2d");
			canvas.width = 1;
			canvas.height = 1;
			canvas.element
				.attr('width', canvas.width)
				.attr('height', canvas.height);
			canvas.resize();
			$(window).resize(function () {
				canvas.resize();
			});
		},
		resize: function () {
			var parent = canvas.element.parent()[0],
				tempImageData = canvas.context.getImageData(0, 0, 
					canvas.width,
					canvas.height);
			canvas.width = parent.offsetWidth*(
				canvas.widthParentPercent/100
			);
			canvas.height = parent.offsetHeight*(
				canvas.heightParentPercent/100
			);
			canvas.context.save();
			canvas.element
				.attr('width', canvas.width)
				.attr('height', canvas.height);
			canvas.context.restore();
			canvas.context.putImageData(tempImageData, 0, 0);
			canvas.element.css("margin-top", ((canvas.height/canvas.width)*(100-canvas.heightParentPercent)/2)+"%");

			app.game.screenUserPosition =
				app.positionMapToScreen(app.game.mapUserPosition);
		},
		bindGameEvents: function () {
			canvas.element
				.on('mousedown', function () {
					app.controls.gameEventClick();
				})
				.on('mousemove', function (event) {
					var offset = canvas.element.offset();
					app.controls.gameEventMouseMove({
						x: event.pageX - offset.left,
						y: event.pageY - offset.top
					});
				});
			$(window).on('keydown', function (event) {
					app.controls.gameEventKeyDown(String.fromCharCode(event.which));
				})
				.on('keyup', function (event) {
					app.controls.gameEventKeyUp(String.fromCharCode(event.which));
				})
				.on('blur', function () {
					app.controls.gameEventBlur();
				});
		},
		unbindGameEvents: function () {
		}
	};
	var app = {
		userName: '',
		defaultUserName: 'Anonymous',
		game: {
			paintRect: {
				width: NaN,
				height: NaN
			},
			mapUserPosition: {
				x: NaN,
				y: NaN
			},
			screenUserPosition: {
				x: NaN,
				y: NaN
			}
		},
		controls: {
			keyAcceleration: {
				W: {x: 0, y: -1},
				A: {x: -1, y: 0},
				S: {x: 0, y: +1},
				D: {x: +1, y: 0}
			},
			keyState: {
				W: false,
				S: false,
				A: false,
				D: false
			},
			rotation: 360,
			acceleration: {
				power: 0,
				rotation: 360
			},
			gameEventBlur: function () {
				// force key up
				for(var index in app.controls.keyState) {
					app.controls.keyState[index] = false;
				}
			},
			gameEventClick: function () {
				app.controls.gameControlShot();
			},
			gameEventMouseMove: function (position) {
				var mapPosition = app.positionScreenToMap(position),
					newRotation = app.angleRadToDeg(
						app.getAngle(
							mapPosition.x - app.game.mapUserPosition.x,
							mapPosition.y - app.game.mapUserPosition.y
						)
					);
				if(app.controls.rotation != newRotation) {
					app.controls.rotation = newRotation;
					app.controls.gameControlRotate();
				}
			},
			gameEventKeyDown: function (key) {
				for(var index in app.controls.keyState) {
					if(key == index) {
						app.controls.keyState[index] = true;
						break;
					}
				}
				app.controls.gameKeyboardEvent();
			},
			gameEventKeyUp: function (key) {
				for(var index in app.controls.keyState) {
					if(key == index) {
						app.controls.keyState[index] = false;
						break;
					}
				}
				app.controls.gameKeyboardEvent();
			},
			gameKeyboardEvent: function () {
				var xAcceleration = 0,
					yAcceleration = 0,
					newRotation,
					newPower;
				for(var index in app.controls.keyState) {
					if(app.controls.keyState[index]) {
						xAcceleration += app.controls.keyAcceleration[index].x;
						yAcceleration += app.controls.keyAcceleration[index].y;
					}
				}
				newPower = Math.sqrt(xAcceleration*xAcceleration+yAcceleration*yAcceleration);
				newPower = (newPower < 1? newPower : 1);
				if(newPower != 0) {
					newRotation = app.angleRadToDeg(
						app.getAngle(
							xAcceleration,
							yAcceleration
						)
					);
				} else {
					newRotation = app.controls.acceleration.rotation;
				}
				if(app.controls.acceleration.power != newPower ||
					app.controls.acceleration.rotation != newRotation) {
					app.controls.acceleration.power = newPower;
					app.controls.acceleration.rotation = newRotation;
					app.controls.gameControlAccelerate();
				}
			},
			gameControlAccelerate: function () {
				socket.emit('game.control', {
					type: "accelerate",
					rotation: app.controls.acceleration.rotation,
					power: app.controls.acceleration.power
				});
			},
			gameControlRotate: function () {
				socket.emit('game.control', {
					type: "rotate",
					rotation: app.controls.rotation
				});
			},
			gameControlShot: function () {
				socket.emit('game.control', {
					type: "shot"
				});
			}
		},
		initUI: function () {
			$('#userNameTextInput').val(app.defaultUserName);
			this.showMenuView();
			$('#menuForm').on('submit', function () {
				app.userName = $('#userNameTextInput').val();
				if(app.userName.length == 0) {
					app.userName = app.defaultUserName;
				}
				$('#userNameTextLabel').text(app.userName);
				app.connect();
				socket.emit('game.join', {userName: app.userName});
				return false;
			});
		},
		positionScreenToMap: function (position) {
			return {
				x: app.game.paintRect.width*(
					position.x/
					canvas.width
				),
				y: app.game.paintRect.height*(
					position.y/
					canvas.height
				)
			};
		},
		positionMapToScreen: function (position) {
			return {
				x: canvas.width*(
					position.x/
					app.game.paintRect.width
				),
				y: canvas.height*(
					position.y/
					app.game.paintRect.height
				)
			};
		},
		getAngle: function (xDelta, yDelta) {
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
		bindSocketEvents: function () {
			socket.on('game.join.ok', function (packet) {
				app.game.paintRect = packet.paintRect;
				app.game.mapUserPosition.x = app.game.paintRect.width/2;
				app.game.mapUserPosition.y = app.game.paintRect.height/2;
				app.hideMenuView();
				canvas.resize();
				canvas.bindGameEvents();
			});
			socket.on('game.join.fail', function (packet) {
				$("#gameJoinFailReason").text(packet.reason);
				app.showErrorView();
			});
		},
		connect: function () {
			socket = io();
			socket.connect();
			app.bindSocketEvents();
		},
		disconnect: function () {
			if(socket !== undefined) {
				socket.disconnect();
				socket = undefined;
			}
		},
		init: function () {
			app.initUI();
		},
		showMenuView: function () {
			$('#menuModal').modal('show');
			$('#userNameTextInput').focus();
		},
		hideMenuView: function () {
			$('#menuModal').modal('hide');
		},
		showErrorView: function () {
			$('#errorModal').modal('show');
		}
	};
	app.init();
	canvas.init();
	gamePaint.app = app;
	gamePaint.canvas = canvas;
});
