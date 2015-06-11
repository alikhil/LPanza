var gamePaint = {
	app: undefined,
	canvas: undefined,
	tanks: [],
	bullets: [],
	borderColor: "#000000",
	paint: function (packet) {
		var tanks, bullets;
		gamePaint.tanks.splice(0, gamePaint.tanks.length);
		tanks = packet.tanks;
		for(var index = 0; index < tanks.length; index ++) {
			tanks[index].color =
				gamePaint.canvas.RGBToCSS(
					tanks[index].color
				);
		}
		gamePaint.tanks = tanks;
		gamePaint.bullets.splice(0, gamePaint.bullets.length);
		bullets = packet.bullets;
		for(var index = 0; index < bullets.length; index ++) {
			bullets[index].color =
				gamePaint.canvas.RGBToCSS(
					bullets[index].color
				);
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
			gamePaint.drawTank(gamePaint.tanks[index]);
		}
		for(var index = 0; index < gamePaint.bullets.length; index ++) {
			gamePaint.drawBullet(gamePaint.bullets[index]);
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
	drawTank: function (tank) {
		gamePaint.drawTankBody(tank);
		gamePaint.drawTurret(tank);
		gamePaint.drawGun(tank);
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
		context.fill();
		context.stroke();

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
