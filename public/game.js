$(document).ready(function () {
	var socket = undefined;
	var canvas = {
		element: undefined,
		context: undefined,
		width: NaN,
		height: NaN,
		sizeParentPercent: 100,
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
/* log */ console.log('window.resize');
			var parent = canvas.element.parent()[0],
				tempImageData = canvas.context.getImageData(0, 0,
					canvas.width,
					canvas.height);
			canvas.width = parent.offsetWidth*(
				canvas.sizeParentPercent/100
			);
			canvas.height = canvas.width*(
				app.game.paintRect.height/
				app.game.paintRect.width
			);
			if(canvas.height > parent.offsetHeight) {
				canvas.height = parent.offsetHeight*(
					canvas.sizeParentPercent/100
				);
				canvas.width = canvas.height*(
					app.game.paintRect.width/
					app.game.paintRect.height
				);
			}
			canvas.context.save();
			canvas.element
				.attr('width', canvas.width)
				.attr('height', canvas.height);
			canvas.context.restore();
			canvas.context.putImageData(tempImageData, 0, 0);
			canvas.element.css(
				"margin-top",
				(parent.offsetHeight-canvas.height)/2+"px"
			);
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
			// for future use
		}
	};
	var app = {
		userName: '',
		defaultUserName: 'Anonymous',
		game: {
			paintRect: {
				width: 1,
				height: 1
			},
			userPosition: {
				x: NaN,
				y: NaN
			},
			backgroundColor: [NaN, NaN, NaN],
			userId: undefined
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
				app.controls.gameKeyboardEvent();
			},
			gameEventClick: function () {
				app.controls.gameControlShot();
			},
			gameEventMouseMove: function (position) {
				var mapPosition = app.positionScreenToMap(position),
					newRotation = app.angleRadToDeg(
						app.getAngle(
							mapPosition.x - app.game.userPosition.x,
							mapPosition.y - app.game.userPosition.y
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
/* log */ console.log('socket.emit(\''+'game.control'+'\', '+JSON.stringify({type: "accelerate",rotation: app.controls.acceleration.rotation,power: app.controls.acceleration.power})+')');
				socket.emit('game.control', {
					type: "accelerate",
					rotation: app.controls.acceleration.rotation,
					power: app.controls.acceleration.power
				});
			},
			gameControlRotate: function () {
// /* log */ console.log('socket.emit(\''+'game.control'+'\', '+JSON.stringify({type: "rotate",rotation: app.controls.rotation})+')');
				socket.emit('game.control', {
					type: "rotate",
					rotation: app.controls.rotation
				});
			},
			gameControlShot: function () {
/* log */ console.log('socket.emit(\''+'game.control'+'\', '+JSON.stringify({type: "shot"})+')');
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
			var ratio = app.game.paintRect.width/canvas.width;
			return {
				x: position.x * ratio,
				y: position.y * ratio
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
		angleDegToRad: function (angle) {
			return Math.PI*(angle/180);
		},
		bindSocketEvents: function () {
			socket.on('game.join.ok', function (packet) {
/* log */ console.log('socket.on(\''+'game.join.ok'+'\', '+JSON.stringify(packet)+')');
				app.game.paintRect = packet.paintRect;
				app.game.userPosition.x = app.game.paintRect.width/2;
				app.game.userPosition.y = app.game.paintRect.height/2;
				app.game.backgroundColor = canvas.RGBToCSS(packet.backgroundColor);
				app.hideMenuView();
				canvas.resize();
				canvas.bindGameEvents();
				app.bindSocketGameEvents();
				app.game.userId = socket.id.toString().substr(0, 5); // copy-paste from server source
			});
			socket.on('game.join.fail', function (packet) {
/* log */ console.log('socket.on(\''+'game.join.fail'+'\', '+JSON.stringify(packet)+')');
				$("#gameJoinFailReason").text(packet.reason);
				app.showErrorView();
			});
		},
		bindSocketGameEvents: function () {
			socket.on('game.paint', function (packet) {
// * log */ console.log('socket.on(\''+'game.paint'+'\', '+JSON.stringify(packet)+')');
                gamePaint.paint(packet);
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
			canvas.init();
			gamePaint.app = app;
			gamePaint.canvas = canvas;
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
});
