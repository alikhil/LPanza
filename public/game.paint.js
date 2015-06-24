var models = {
	objects: {},
	drawTank: function (tank) {
		var turret = tank.turret,
			modelTank = this.objects['tank'][tank.subtype],
			modelTurret = this.objects['turret'][tank.subtype],
			tankAngle = utils.angleDegToRad(tank.rotation-90),
			relativeTurretAngle = utils.angleDegToRad(turret.rotation-90) - tankAngle,
			context = canvas.context,
			relativeTurretCenter = utils.point(
				modelTank.turretCenter.x -
					modelTank.center.x,
				modelTank.turretCenter.y -
					modelTank.center.y
			);
		drawModel(modelTank, tank.position, tankAngle);
		drawModel(modelTurret, relativeTurretCenter, relativeTurretAngle);

		context.restore();
		context.restore();
	},
	drawModel: function (model, position, rotation) {
		var context = canvas.context,
			angle = utils.angleDegToRad(rotation-90);
		context.save();
		context.translate(
			position.x,
			position.y
		);
		context.rotate(angle);

		context.drawImage(
			model.image,
			-model.width/2
				-model.center.x,
			-model.length/2
				-model.center.y
		);
	},
	drawSimpleObject: function (terrain) {
		var modelTerrain = this.objects[terrain.type][terrain.subtype],
			context = canvas.context,
			angle = utils.angleDegToRad(terrain.rotation-90);
		drawModel(modelTerrain, terrain.position, angle);

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
				this.objects[type][subtype].image = new Image();
				this.objects[type][subtype].image.src = type + '.' + subtype + '.texture.png';
			}
		}
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
		return utils.moveVector(
			relativeTurretCenterAngle,
			utils.vectorLength(relativeTurretCenter)
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
			background: undefined,
			grid: '#A0A0A0',
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
	gridStep: 20,
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
			if(objects[index].type === 'tank') {
				tanks.push(objects[index]);
				if(objects[index].label.userId == game.userId) {
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
					this.userScore = objects[index].label.score;
					break;
				}
			} else {
				nonTanks.push();
			}
		}
		if(index >= objects.length) {
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
			tanks[index].position.x -= offset.x;
			tanks[index].position.y -= offset.y;
		}
		this.tanks = tanks;
		for(index = 0; index < nonTanks.length; index ++) {
			nonTanks[index].position.x -= offset.x;
			nonTanks[index].position.y -= offset.y;
		}
		this.nonTanks = nonTanks;
		this.repaint();
	},
	repaint: function () {
		if(controls.useTouch) {
			this.clearJoystick();
		}
		this.scaleAsMap();
		this.drawEmpty();
		this.drawBackground();
		this.drawGrid();
		for(var index = 0; index < this.tanks.length; index ++) {
			models.drawObject(this.tanks[index]);
		}
		for(var index = 0; index < this.nonTanks.length; index ++) {
			this.drawObject(this.nonTanks[index]);
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