$(document).ready(function () {
	var socket = undefined;
	var canvas = {
		element: undefined,
		context: undefined,
		xSize: 0,
		ySize: 0,
		ySizeParentPercent: 90,
		xSizeParentPercent: 90,
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
			canvas.element
				.width(1)
				.height(1);
			canvas.xSize = 1;
			canvas.ySize = 1;
			canvas.resize();
			$(window).resize(function () {
				canvas.resize();
			});
		},
		resize: function () {
			var parent = canvas.element.parent()[0],
				tempImageData = canvas.context.getImageData(0, 0, 
					canvas.xSize, 
					canvas.ySize);
			canvas.xSize = parent.offsetWidth*canvas.xSizeParentPercent/100; 
			canvas.ySize = parent.offsetHeight*canvas.ySizeParentPercent/100;
			canvas.context.save();
			canvas.element.width(canvas.xSize);
			canvas.element.height(canvas.ySize);
			canvas.context.restore();
			canvas.context.putImageData(tempImageData, 0, 0);
			canvas.element.css("margin-top", ((canvas.ySize/canvas.xSize)*(100-canvas.ySizeParentPercent)/2)+"%");
		},
		bindGameEvents: function () {
			canvas.element
				.on('mousedown', function (event) {
					var offset = $(this).offset();
					app.gameEventClick(
						event.pageX - offset.left,
						event.pageY - offset.top
						);
				});
			$(window).on('keydown', function (event) {
					app.gameEventKeyDown(String.fromCharCode(event.which));
				})
				.on('keyup', function (event) {
					app.gameEventKeyUp(String.fromCharCode(event.which));
				});
		},
		unbindGameEvents: function () {
		}
	};
	var app = {
		userName: '',
		defaultUserName: 'Anonymous', 
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
		gameEventClick: function (x, y) {
			socket.emit('game.input', {type: "mouse", });
		},
		gameEventKeyDown: function (key) {
			socket.emit('game.input', {
				type: "keyboard", 
				key: String.fromCharCode(event.which),
				state: "down"});
		},
		gameEventKeyUp: function (key) {
			socket.emit('game.input', {
				type: "keyboard", 
				key: String.fromCharCode(event.which),
				state: "up"});
		},
		bindSocketEvents: function () {
			socket.on('game.join.ok', function (packet) {
				app.hideMenuView();
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
});
