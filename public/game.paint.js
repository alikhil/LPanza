var gamePaint = {
	app: undefined,
	canvas: undefined,
	tanks: [],
	bullets: [],
	borderColor: '#000000',
	voidColor: '#000000',
	labelFont: '12px Arial',
	labelColor2: '#404040',
	labelColor: '#BFBFBF',
	paintRectPosition: undefined,
	drawRect: undefined,
	gridStep: 20,
	gridColor: '#a0a0a0',
	paint: function (packet) {
		var tanks,
			bullets,
			offset = {
				x: 0,
				y: 0
			},
			index;
		gamePaint.paintRectPosition = offset;
		gamePaint.drawRect = {
			left: (gamePaint.paintRectPosition.x < 0
				?
					-gamePaint.paintRectPosition.x
				:
					0
				),
			top: (gamePaint.paintRectPosition.y < 0
				?
					-gamePaint.paintRectPosition.y
				:
					0
				),
			right: (gamePaint.paintRectPosition.x +
				gamePaint.app.game.paintRect.width >
				gamePaint.app.game.mapSize.width
				?
					gamePaint.paintRectPosition.x +
					gamePaint.app.game.paintRect.width -
					gamePaint.app.game.mapSize.width
				:
					gamePaint.app.game.paintRect.width
				),
			bottom: (gamePaint.paintRectPosition.y +
				gamePaint.app.game.paintRect.height >
				gamePaint.app.game.mapSize.height
				?
					gamePaint.paintRectPosition.y +
					gamePaint.app.game.paintRect.height -
					gamePaint.app.game.mapSize.height
				:
					gamePaint.app.game.paintRect.height
				)
		};
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
		scaleRatio = gamePaint.scaleAsMap();
		gamePaint.drawVoid();
		gamePaint.drawBackground();
		gamePaint.drawGrid();
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
	drawVoid: function () {
		var context = gamePaint.canvas.context;
		context.fillStyle = gamePaint.voidColor;
		context.fillRect(
			0, 0,
			gamePaint.app.game.paintRect.width,
			gamePaint.app.game.paintRect.height
		);
	},
	drawBackground: function () {
		var context = gamePaint.canvas.context;
		context.fillStyle = gamePaint.app.game.backgroundColor;
		if(gamePaint.paintRectPosition.y < 0) {
		}
		context.fillRect(
			gamePaint.drawRect.left,
			gamePaint.drawRect.top,
			gamePaint.drawRect.bottom -
				gamePaint.drawRect.top,
			gamePaint.drawRect.right -
				gamePaint.drawRect.left
		);
	},
	drawGrid: function () {
		var context = gamePaint.canvas.context;
		context.beginPath();
		context.fillStyle = gamePaint.gridColor;
		for(var positionX = gamePaint.drawRect.left +
				gamePaint.gridStep -
				(gamePaint.drawRect.left +
				gamePaint.paintRectPosition.x) %
				gamePaint.gridStep;
			positionX < gamePaint.drawRect.right;
			positionX += gamePaint.gridStep) {
			context.moveTo(
				positionX,
				gamePaint.drawRect.top
			);
			context.lineTo(
				positionX,
				gamePaint.drawRect.bottom
			);
		}
		for(var positionY = gamePaint.drawRect.top +
				gamePaint.gridStep -
				(gamePaint.drawRect.top +
				gamePaint.paintRectPosition.y) %
				gamePaint.gridStep;
			positionY < gamePaint.drawRect.bottom;
			positionY += gamePaint.gridStep) {
			context.moveTo(
				gamePaint.drawRect.left,
				positionY
			);
			context.lineTo(
				gamePaint.drawRect.right,
				positionY
			);
		}
		context.stroke();
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
		// front bumper
		gamePaint.drawRectObject(
			tank.position,
			{
				width: tank.size.width,
				length: tank.size.length/4 -
					tank.turret.radius/2
			},
			tank.rotation,
			tank.turret.color,
			tank.size.length/4 +
				tank.turret.radius/2
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
		context.stroke();
		context.fill();
	}
};
