$(document).ready(function () {
	var socket = undefined;
	var app = {
		userName: '',
		defaultUserName: 'Anonymous', 
		initUI: function () {
			$('#userNameTextInput').val(app.defaultUserName);
			this.showMenuView();
			$('#menuForm').submit(function () {
				app.userName = $('#userNameTextInput').val();
				if(app.userName.length == 0) {
					app.userName = app.defaultUserName;
				}
				$('#userNameTextLabel').text(app.userName);
				app.hideMenuView();
				app.connect();
				socket.emit('game.join', {userName: app.userName});
				return false;
			});
		},
		bindSocketEvents: function () {
			socket.on('game.join.ok', function (packet) {
				app.hideMenuView();
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
});