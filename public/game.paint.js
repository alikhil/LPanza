var gamePaint = {
	app: undefined,
	canvas: undefined,
	tanks: [],
	bullets: [],
	borderColor: '#000000',
	labelFont: '12px Arial',
	labelColor2: '#404040',
	labelColor: '#BFBFBF',
	paint: function (packet) {
		var tanks,
			bullets,
			offset = {
				x: 0,
				y: 0
			},
			index;
		gamePaint.tanks.splice(0, gamePaint.tanks.length);
		tanks = packet.tanks;
		for(index = 0; index < tanks.length; index ++) {
			if(tanks[index].label.userId == gamePaint.app.game.userId) {
				offset.x = tanks[index].position.x -
					gamePaint.app.game.paintRect.width/2;
				offset.y = tanks[index].position.y -
					gamePaint.app.game.paintRect.height/2;
				break;
			}
		}
		if(index >= tanks.length) {
			console.log('Current player`s tank not found');
		}
		for(index = 0; index < tanks.length; index ++) {
			tanks[index].color =
				gamePaint.canvas.RGBToCSS(
					tanks[index].color
				);
			tanks[index].turret.color =
				gamePaint.canvas.RGBToCSS(
					tanks[index].turret.color
				);
			tanks[index].turret.gun.color =
				gamePaint.canvas.RGBToCSS(
					tanks[index].turret.gun.color
				);
			tanks[index].position.x -= offset.x;
			tanks[index].position.y -= offset.y;
		}
		gamePaint.tanks = tanks;
		gamePaint.bullets.splice(0, gamePaint.bullets.length);
		bullets = packet.bullets;
		for(index = 0; index < bullets.length; index ++) {
			bullets[index].color =
				gamePaint.canvas.RGBToCSS(
					bullets[index].color
				);
			bullets[index].position.x -= offset.x;
			bullets[index].position.y -= offset.y;
		}
		gamePaint.bullets = bullets;
		gamePaint.repaint();
	},
	repaint: function () {
		var scaleRatio;
		//gamePaint.clear();
		gamePaint.drawBackground();
		scaleRatio = gamePaint.scaleAsMap();
		for(var index = 0; index < gamePaint.tanks.length; index ++) {
			gamePaint.drawTankBody(gamePaint.tanks[index]);
		}
		for(var index = 0; index < gamePaint.tanks.length; index ++) {
			gamePaint.drawTurret(gamePaint.tanks[index]);
		}
		for(var index = 0; index < gamePaint.tanks.length; index ++) {
			gamePaint.drawGun(gamePaint.tanks[index]);
		}
		for(var index = 0; index < gamePaint.bullets.length; index ++) {
			gamePaint.drawBullet(gamePaint.bullets[index]);
		}
		for(var index = 0; index < gamePaint.tanks.length; index ++) {
			gamePaint.drawLabel(gamePaint.tanks[index]);
		}
		gamePaint.scaleAsScreen(scaleRatio);
	},
	drawBackground: function () {
		var context = gamePaint.canvas.context;
		context.fillStyle = gamePaint.app.game.backgroundColor;
		context.fillRect(
			0, 0,
			gamePaint.canvas.width,
			gamePaint.canvas.height
		);
	},
	scaleAsMap: function () {
		var ratio = gamePaint.canvas.width/gamePaint.app.game.paintRect.width;
		gamePaint.canvas.context.scale(ratio, ratio);
		return ratio;
	},
	scaleAsScreen: function (ratio) {
		gamePaint.canvas.context.scale(1/ratio, 1/ratio);
	},
	clear: function () {
		var context = gamePaint.canvas.context;
		context.clearRect(
			0, 0,
			gamePaint.canvas.width,
			gamePaint.canvas.height
		);
	},
	drawTankBody: function (tank) {
		gamePaint.drawRectObject(
			tank.position,
			tank.size,
			tank.rotation,
			tank.color,
			-tank.size.length/2
		);
	},
	drawTurret: function (tank) {
		var turret = tank.turret;
		gamePaint.drawCircleObject(
			tank.position,
			turret.radius,
			turret.color
		);
	},
	drawGun: function (tank) {
		var turret = tank.turret,
			gun = turret.gun;
		gamePaint.drawRectObject(
			tank.position,
			gun.size,
			turret.rotation,
			gun.color,
			gun.distance
		);
	},
	drawLabel: function (tank) {
		var context = gamePaint.canvas.context,
			text = tank.label.userName + ' [' + tank.label.hp + ' \u2764]';
		context.textAlign = 'center';
		context.font = gamePaint.labelFont;
		context.fillStyle = gamePaint.labelColor;
		context.fillText(
			text,
			tank.position.x,
			tank.position.y - tank.size.length
		);
		context.fillStyle = gamePaint.labelColor2;
		context.fillText(
			text,
			tank.position.x+1,
			tank.position.y - tank.size.length + 1
		);
	},
	drawBullet: function (bullet) {
		gamePaint.drawRectObject(
			bullet.position,
			bullet.size,
			bullet.rotation,
			bullet.color,
			-bullet.size.length/2
		);
	},
	drawRectObject: function (position, size, rotation, color, distance) {
		var context = gamePaint.canvas.context;
		context.translate(position.x, position.y);
		context.rotate(gamePaint.app.angleDegToRad(rotation-90));

		context.beginPath();
		context.strokeStyle = gamePaint.borderColor;
		context.fillStyle = color;
		context.rect(
			-size.width/2,
			distance,
			size.width,
			size.length
		);
		context.stroke();
		context.fill();

		context.rotate(-gamePaint.app.angleDegToRad(rotation-90));
		context.translate(-position.x, -position.y);
	},
	drawCircleObject: function (position, radius, color) {
		var context = gamePaint.canvas.context;

		context.beginPath();
		context.strokeStyle = gamePaint.borderColor;
		context.fillStyle = color;
		context.arc(
			position.x,
			position.y,
			radius,
			0, 2*Math.PI
		);
		context.fill();
		context.stroke();
	}
};
