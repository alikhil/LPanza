var paint = {
	tanks: [],
	bullets: [],
	labelFont: '12px Arial',
	color: {
		map: {
			background: undefined,
			grid: '#A0A0A0',
			empty: '#202020'
		},
		label: {
			background: '#BFBFBF',
			text: '#404040'
		},
		hp: {
			active: '20FF20',
			background: '#FF2020'
		},
		border: '#202020'
	},
	mapOffset: undefined,
	drawRect: undefined,
	gridStep: 20,
	onPaint: function (packet) {
		var tanks,
			bullets,
			offset,
			index;
		this.tanks.splice(0, this.tanks.length);
		tanks = packet.tanks;
		for(index = 0; index < tanks.length; index ++) {
			if(tanks[index].label.userId == game.userId) {
				offset = utils.point(
					tanks[index].position.x -
						game.paintRect.width/2,
					tanks[index].position.y -
						game.paintRect.height/2
				);
				break;
			}
		}
		if(index >= tanks.length) {
			offset = utils.point(0, 0);
			console.log('Current player`s tank not found');
		}
		this.mapOffset = offset;
		this.drawRect = {
			left: (offset.x < 0
				?
					-offset.x
				:
					0
				),
			top: (offset.y < 0
				?
					-offset.y
				:
					0
				),
			right: (offset.x +
				game.paintRect.width >
				game.mapSize.width
				?
					game.mapSize.width -
					offset.x
				:
					game.paintRect.width
				),
			bottom: (offset.y +
				game.paintRect.height >
				game.mapSize.height
				?
					game.mapSize.height -
					offset.y
				:
					game.paintRect.height
				)
		};
		for(index = 0; index < tanks.length; index ++) {
			tanks[index].color =
				utils.RGBToCSS(
					tanks[index].color
				);
			tanks[index].turret.color =
				utils.RGBToCSS(
					tanks[index].turret.color
				);
			tanks[index].turret.gun.color =
				utils.RGBToCSS(
					tanks[index].turret.gun.color
				);
			tanks[index].position.x -= offset.x;
			tanks[index].position.y -= offset.y;
		}
		this.tanks = tanks;
		this.bullets.splice(0, this.bullets.length);
		bullets = packet.bullets;
		for(index = 0; index < bullets.length; index ++) {
			bullets[index].color =
				utils.RGBToCSS(
					bullets[index].color
				);
			bullets[index].position.x -= offset.x;
			bullets[index].position.y -= offset.y;
		}
		this.bullets = bullets;
		this.repaint();
	},
	repaint: function () {
		//this.clear();
		this.scaleAsMap();
		this.drawEmpty();
		this.drawBackground();
		this.drawGrid();
		for(var index = 0; index < this.tanks.length; index ++) {
			this.drawTankBody(this.tanks[index]);
		}
		for(var index = 0; index < this.tanks.length; index ++) {
			this.drawTurret(this.tanks[index]);
		}
		for(var index = 0; index < this.tanks.length; index ++) {
			this.drawGun(this.tanks[index]);
		}
		for(var index = 0; index < this.bullets.length; index ++) {
			this.drawBullet(this.bullets[index]);
		}
		for(var index = 0; index < this.tanks.length; index ++) {
			this.drawLabel(this.tanks[index]);
		}
		this.scaleAsScreen();
	},
	drawEmpty: function () {
		var context = canvas.context;
		context.fillStyle = this.color.map.empty;
		context.fillRect(
			0, 0,
			game.paintRect.width,
			game.paintRect.height
		);
	},
	drawBackground: function () {
		var context = canvas.context;
		context.fillStyle = game.backgroundColor;
		context.fillRect(
			this.drawRect.left,
			this.drawRect.top,
			this.drawRect.right -
				this.drawRect.left,
			this.drawRect.bottom -
				this.drawRect.top
		);
	},
	drawGrid: function () {
		var context = canvas.context;
		context.beginPath();
		context.strokeStyle = this.color.map.grid;
		for(var positionX = this.drawRect.left +
				this.gridStep -
				(this.drawRect.left +
				this.mapOffset.x) %
				this.gridStep;
			positionX < this.drawRect.right;
			positionX += this.gridStep) {
			context.moveTo(
				positionX,
				this.drawRect.top
			);
			context.lineTo(
				positionX,
				this.drawRect.bottom
			);
		}
		for(var positionY = this.drawRect.top +
				this.gridStep -
				(this.drawRect.top +
				this.mapOffset.y) %
				this.gridStep;
			positionY < this.drawRect.bottom;
			positionY += this.gridStep) {
			context.moveTo(
				this.drawRect.left,
				positionY
			);
			context.lineTo(
				this.drawRect.right,
				positionY
			);
		}
		context.stroke();
	},
	scaleAsMap: function () {
		var ratio = canvas.renderSize.width/
			game.paintRect.width,
			offset = canvas.renderOffset,
			context = canvas.context;
		context.save();
		context.translate(
			offset.x,
			offset.y
		);
		context.beginPath();
		context.rect(
			0,
			0,
			canvas.renderSize.width,
			canvas.renderSize.height
		);
		context.clip();
		context.scale(
			ratio,
			ratio
		);
	},
	scaleAsScreen: function () {
		var context = canvas.context;
		context.restore();
	},
	clear: function () {
		var context = canvas.context;
		context.clearRect(
			0, 0,
			canvas.size.width,
			canvas.size.height
		);
	},
	drawTankBody: function (tank) {
		this.drawRectObject(
			tank.position,
			tank.size,
			tank.rotation,
			tank.color,
			-tank.size.length/2
		);
		// front bumper
		this.drawRectObject(
			tank.position,
			utils.sizeWL(
				tank.size.width,
				tank.size.length/4 -
					tank.turret.radius/2
			),
			tank.rotation,
			tank.turret.color,
			tank.size.length/4 +
				tank.turret.radius/2
		);
	},
	drawTurret: function (tank) {
		var turret = tank.turret;
		this.drawCircleObject(
			tank.position,
			turret.radius,
			turret.color
		);
	},
	drawGun: function (tank) {
		var turret = tank.turret,
			gun = turret.gun;
		this.drawRectObject(
			tank.position,
			gun.size,
			turret.rotation,
			gun.color,
			gun.distance
		);
	},
	drawLabel: function (tank) {
		var context = canvas.context,
			text = tank.label.userName + 
				' [' + tank.label.hp + ' \u2764]';
		context.textAlign = 'center';
		context.font = this.labelFont;
		context.fillStyle = this.color.label.text;
		context.fillText(
			text,
			tank.position.x,
			tank.position.y - tank.size.length
		);
	},
	drawBullet: function (bullet) {
		this.drawRectObject(
			bullet.position,
			bullet.size,
			bullet.rotation,
			bullet.color,
			-bullet.size.length/2
		);
	},
	drawRectObject: function (position, size, rotation, color, distance) {
		var context = canvas.context,
			angle = utils.angleDegToRad(rotation-90);
		context.save();
		context.translate(
			position.x,
			position.y
		);
		context.rotate(angle);

		context.beginPath();
		context.strokeStyle = this.color.border;
		context.fillStyle = color;
		context.rect(
			-size.width/2,
			distance,
			size.width,
			size.length
		);
		context.stroke();
		context.fill();

		context.restore();
	},
	drawCircleObject: function (position, radius, color) {
		var context = canvas.context;
		context.beginPath();
		context.strokeStyle = this.color.border;
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