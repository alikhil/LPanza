var models = {
	objects: {},
	drawTank: function (tank) {
		var turret = tank.turret,
			modelTank = this.objects['tank'][tank.subtype],
			modelTurret = this.objects['turret'][tank.subtype],
			tankAngle = tank.rotation,
			relativeTurretAngle = turret.rotation - 90 - tankAngle,
			context = canvas.context,
			relativeTurretCenter = utils.point(
				modelTank.turretCenter.x -
					modelTank.center.x,
				modelTank.turretCenter.y -
					modelTank.center.y
			);
		this.drawModel(modelTank, tank.position, tankAngle);
		this.drawModel(modelTurret, relativeTurretCenter, relativeTurretAngle);

		context.restore();
		context.restore();
	},
	drawModel: function (model, position, rotation) {
		var context = canvas.context,
			angle = utils.angleDegToRad(rotation+180-90);
		context.save();
		context.translate(
			position.x,
			position.y
		);
		context.rotate(angle);

		context.drawImage(
			model.image,
			-model.size.width/2
				-model.center.x,
			-model.size.length/2
				-model.center.y
		);
	},
	drawSimpleObject: function (object) {
		var model = this.objects[object.type][object.subtype],
			context = canvas.context,
			angle = object.rotation;
		this.drawModel(model, object.position, angle);

		context.restore();
	},
	drawObject: function (object) {
		if(object.type === 'tank') {
			this.drawTank(object);
		} else {
			this.drawSimpleObject(object);
		}
	},
	loadModels: function (models) {
		this.objects = models;
		for(var type in this.objects) {
			for(var subtype in this.objects[type]) {
				this.objects[type][subtype].center.y *= -1;
				this.objects[type][subtype].image = new Image();
				this.objects[type][subtype].image.src = type + '.' + subtype + '.texture.png';
			}
		}
		paint.gridImage = new Image();
		paint.gridImage.src = 'background.texture.jpg';
	},
	getRelativeTurretCenterPosition: function (tank) {
		var turret = tank.turret,
			modelTank = this.objects[tank.type][tank.subtype],
			tankAngle = utils.angleDegToRad(tank.rotation-90),
			relativeTurretCenter = utils.point(
				modelTank.turretCenter.x -
					modelTank.center.x,
				modelTank.turretCenter.y -
					modelTank.center.y
			),
			relativeTurretCenterAngle = utils.vectorAngle(
				relativeTurretCenter.x,
				relativeTurretCenter.y
			) - tankAngle;
			if(relativeTurretCenter.x == 0 &&
				relativeTurretCenter.y == 0) {
				relativeTurretCenterAngle = 0;
			}
		return utils.moveVector(
			relativeTurretCenterAngle,
			utils.vectorLength(
				relativeTurretCenter.x,
				relativeTurretCenter.y
			)
		);
	}
};
var paint = {
	tanks: [],
	nonTanks: [],
	label: {
		font: '10px Arial'
	},
	joystickAlpha: 0.5,
	color: {
		map: {
			empty: '#A0A0A0'
		},
		label: {
			background: '#BFBFBF',
			text: '#404040'
		},
		hp: {
			active: '#20FF20',
			background: '#FF2020'
		},
		joystick: {
			inner: '#A0A0A0',
			outer: '#808080',
			active: '#FF2020'
		},
		border: '#202020'
	},
	mapOffset: undefined,
	drawRect: undefined,
	gridStep: 512,
	gridImage: undefined,
	userScore: NaN,
	onPaint: function (packet) {
		var objects,
			tanks = [],
			nonTanks = [],
			offset,
            index;
		this.nonTanks.splice(0, this.nonTanks.length);
		this.tanks.splice(0, this.tanks.length);
		objects = packet.objects;
		for(index = 0; index < objects.length; index ++) {
			if(objects[index].type === 'tank' &&
				objects[index].label.userId == game.userId) {
				offset = utils.point(
					objects[index].position.x -
						game.tankCenter.x,
					objects[index].position.y -
						game.tankCenter.y
				);
				controls.turretCenter = utils.addVector(
					objects[index].position,
					models.getRelativeTurretCenterPosition(objects[index])
				);
				controls.turretCenter.x -= offset.x;
				controls.turretCenter.y -= offset.y;
				this.userScore = objects[index].label.score;
				break;
			}
		}
		if(index >= objects.length) {
			offset = utils.point(0, 0);
			console.log('Current player`s tank not found');
		}
		for(index = 0; index < objects.length; index ++) {
			objects[index].position.x -= offset.x;
			objects[index].position.y -= offset.y;
			if(objects[index].type === 'tank') {
				tanks.push(objects[index]);
			} else {
				nonTanks.push(objects[index]);
			}
		}
		this.tanks = tanks;
		this.nonTanks = nonTanks;
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
		if(app.isTabActive) {
			this.repaint();
		}
	},
	repaint: function () {
		if(controls.useTouch) {
			this.clearJoystick();
		}
		this.scaleAsMap();
		this.drawEmpty();
		this.drawBackground();
		for(var index = 0; index < this.tanks.length; index ++) {
			models.drawObject(this.tanks[index]);
		}
		for(var index = 0; index < this.nonTanks.length; index ++) {
			models.drawObject(this.nonTanks[index]);
		}
		for(var index = 0; index < this.tanks.length; index ++) {
			this.drawLabel(this.tanks[index]);
		}
		this.drawScore(this.userScore);
		this.scaleAsScreen();
		if(controls.useTouch) {
			this.drawJoystick();
		}
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
		for(var positionX = this.drawRect.left -
				(this.drawRect.left +
				this.mapOffset.x) %
				this.gridStep;
			positionX < this.drawRect.right;
			positionX += this.gridStep) {
			for(var positionY = this.drawRect.top -
					(this.drawRect.top +
					this.mapOffset.y) %
					this.gridStep;
				positionY < this.drawRect.bottom;
				positionY += this.gridStep) {
				context.drawImage(paint.gridImage, positionX, positionY);
			}
		}
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
	clearJoystick: function () {
		var context = canvas.context,
			diameter = 2*(joystick.margin +
				joystick.radius.outer)
			left = joystick.margin,
			_top = canvas.size.height -
				diameter;
		context.clearRect(
			left,
			_top,
			diameter,
			diameter
		);
	},
	drawLabel: function (tank) {
		var context = canvas.context,
			text = tank.label.userName +
				' [' + tank.label.hp + ' \u2764]',
			model = models.objects[tank.type][tank.subtype];
		context.fillStyle = this.color.hp.background;
		context.fillRect(
			tank.position.x - model.size.width/2,
			tank.position.y - model.size.length*3/4,
			model.size.width,
			model.size.length/8
		);
		context.fillStyle = this.color.hp.active;
		context.fillRect(
			tank.position.x - model.size.width/2,
			tank.position.y - model.size.length*3/4,
			model.size.width*tank.label.hp/10,
			model.size.length/8
		);
		context.textAlign = 'center';
		context.font = this.label.font;
		context.fillStyle = this.color.label.text;
		context.fillText(
			text,
			tank.position.x,
			tank.position.y - model.size.length
		);
	},
	drawScore: function (score) {
		$('#gameStatsScore').text(score);
	},
	drawJoystick: function () {
		var context = canvas.context,
			oldAlpha;
		oldAlpha = context.globalAlpha;
		context.globalAlpha = this.joystickAlpha;
		this.drawCircleObject(
			joystick.center,
			joystick.radius.outer,
			this.color.joystick.outer
		);
		if(controls.acceleration.power > 0) {
			this.drawJoystickActiveSector();
		}
		this.drawCircleObject(
			joystick.center,
			joystick.radius.inner,
			this.color.joystick.inner
		);
		context.globalAlpha = oldAlpha;
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
			0,
			Math.PI*2
		);
		context.stroke();
		context.fill();
	},
	drawJoystickActiveSector: function () {
		var context = canvas.context,
			atAngle = utils.angleDegToRad(
				controls.acceleration.rotation
			),
			angle = utils.angleDegToRad(
				joystick.activeAngle
			);
		context.beginPath();
		context.strokeStyle = this.color.border;
		context.fillStyle = this.color.joystick.active;
		context.arc(
			joystick.center.x,
			joystick.center.y,
			joystick.radius.outer,
			atAngle -
				angle/2,
			atAngle +
				angle/2
		);
		context.arc(
			joystick.center.x,
			joystick.center.y,
			joystick.radius.inner,
			atAngle +
				angle/2,
			atAngle -
				angle/2,
			true
		);
		context.stroke();
		context.fill();
	}
};