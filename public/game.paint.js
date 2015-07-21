var models = {
	objects: {},
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
	drawObject: function (object) {
		var model = this.objects[object.type][object.subtype],
			context = canvas.context,
			angle = object.rotation;
		this.drawModel(model, object.position, angle);

		context.restore ();
	},
	loadModels: function (models) {
		this.objects = models;
		for(var type in this.objects) {
			for(var subtype in this.objects[type]) {
				this.objects[type][subtype].center.y *= -1;
				if (type === 'tank') {
					this.objects[type][subtype].turretCenter.y *= -1;
				}
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
			tankAngle = utils.angleDegToRad(tank.rotation + 90),
			relativeTurretCenter = utils.point(
				modelTank.turretCenter.x -
					modelTank.center.x,
				modelTank.turretCenter.y -
					modelTank.center.y
			),
			relativeTurretCenterAngle = utils.vectorAngle(
				relativeTurretCenter.x,
				relativeTurretCenter.y
			) + tankAngle;
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
	},
	turret: function (tank) {
		return {
			position: utils.addVector(
				tank.position,
				models.getRelativeTurretCenterPosition(tank)
			),
			rotation: tank.turret.rotation,
			type: 'turret',
			subtype: tank.subtype
		};
	}
};
var paint = {
	objects: [],
	label: {
		font: '10px Arial'
	},
	joystickAlpha: 0.3,
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
			outer: '#a0a0a0',
			active: '#FF6060'
		},
		border: '#202020'
	},
	mapOffset: undefined,
	drawRect: undefined,
	gridStep: 512,
	gridImage: undefined,
	userScore: NaN,
	onPaint: function (packet) {
		var objects = [],
			objectsCount,
			offset,
			index;
		//console.log(JSON.stringify(packet));
		this.objects.splice(0, this.objects.length);
		objects = packet.objects;

		if (objects[0].position.x +
				game.paintRect.width / 2 >
				game.mapSize.width) {
			game.tankCenter.x = objects[0].position.x +
				game.paintRect.width -
				game.mapSize.width;
		} else if (objects[0].position.x < game.paintRect.width / 2) {
			game.tankCenter.x = objects[0].position.x;
		} else {
			game.tankCenter.x = game.paintRect.width / 2;
		}
		if (objects[0].position.y +
				game.paintRect.height / 2 >
				game.mapSize.height) {
			game.tankCenter.y = objects[0].position.y +
				game.paintRect.height -
				game.mapSize.height;
		} else if (objects[0].position.y < game.paintRect.height / 2) {
			game.tankCenter.y = objects[0].position.y;
		} else {
			game.tankCenter.y = game.paintRect.height / 2;
		}

		if (game.lastTankCenter.x != game.tankCenter.x ||
				game.lastTankCenter.y != game.tankCenter.y) {
			controls.tankCenterMove ();
		}
		game.lastTankCenter = utils.point (
			game.tankCenter.x,
			game.tankCenter.y
		);

		offset = utils.point(
			objects[0].position.x -
				game.tankCenter.x,
			objects[0].position.y -
				game.tankCenter.y
		);
		controls.turretCenter = utils.addVector(
			game.tankCenter,
			models.getRelativeTurretCenterPosition(objects[0])
		);
		this.userScore = packet.user.score;

		if (packet.user.reload == 0 && (
				controls.wantShot ||
				controls.wantSingleShot
			)) {
			game.input.shot();
		}
		controls.wantSingleShot = false;

		objectsCount = objects.length;
		for(index = 0; index < objectsCount; index ++) {
			objects[index].position.x -= offset.x;
			objects[index].position.y -= offset.y;
			if(objects[index].type === 'tank') {
				objects.push (
					models.turret (
						objects[index]
					)
				);
			}
		}
		this.objects = objects;
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
		for(var index = 0; index < this.objects.length; index ++) {
			models.drawObject(this.objects[index]);
		}
		for(var index = 0; index < this.objects.length; index ++) {
			if (this.objects[index].type === 'tank') {
				this.drawLabel(this.objects[index]);
			}
		}
		this.drawScore(this.userScore);
		this.scaleAsScreen();
		if(controls.useTouch) {
			this.drawJoystick();
		}
	},
	drawEmpty: function () {
		var context = canvas.context;
		context.beginPath();
		context.fillStyle = this.color.map.empty;
		context.fillRect(
			0, 0,
			game.paintRect.width,
			game.paintRect.height
		);
	},
	drawBackground: function () {
		var context = canvas.context;
		context.save();
		context.beginPath();
		context.rect(
			this.drawRect.left,
			this.drawRect.top,
			this.drawRect.right -
				this.drawRect.left,
			this.drawRect.bottom -
				this.drawRect.top
		);
		context.clip();
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
		context.restore();
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
		canvas.context.clearRect(
			0, 0, canvas.size.width, canvas.size.height
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
			oldAlpha,
			a, b, d, al = 10, r = 4, R = swipe.threshold;
		if (swipe.joyIs) {
			a = controls.touch.touches.first[swipe.joy];
			b = controls.touch.touches.current[swipe.joy];
			d = utils.vectorLength (b.x - a.x, b.y - a.y);
			context.save ();
			context.translate (a.x, a.y);
			context.rotate (utils.angleDegToRad (controls.acceleration.rotation-90));
			oldAlpha = context.globalAlpha;
			context.globalAlpha = this.joystickAlpha;
			context.beginPath ();
			context.strokeStyle = '#FFFF40';
			context.lineCap = 'round';
			context.lineJoin = 'round';
			context.lineWidth = r;
			context.arc (0, 0, R, 0, 2*Math.PI);
			context.moveTo(0, 0);
			context.lineTo(0, d);
			context.lineTo(-al, d - al);
			context.moveTo(0, d);
			context.lineTo(al, d - al);
			context.stroke ();
			context.globalAlpha = oldAlpha;
			context.restore ();
		}
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