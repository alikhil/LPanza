var models = {
	objects: {},
	loadModels: function (models) {
		var containerContainer = $('#containerContainer'),
			container;
		this.objects = models;
		for(var type in this.objects) {
			for(var subtype in this.objects[type]) {
				/*this.objects[type][subtype].center.y *= -1;
				if (type === 'turret') {
					this.objects[type][subtype].reload.center.y *= -1;
				}
				if (type === 'tank') {
					this.objects[type][subtype].turretCenter.y *= -1;
					this.objects[type][subtype].hp.center.y *= -1;
				}*/
				this.objects[type][subtype].container = $('#' + 'model_' + type + '_' + subtype + '_vector');
				//container = $('<div>');
				//container.attr ('id', 'model_'+type+'_'+subtype+'_vector');
				//containerContainer.append (container);
				//this.objects[type][subtype].container = container;
				//$.ajaxSetup({async: false});
				//this.objects[type][subtype].container.load (type + '.' + subtype + '.vex.svg');
			}
		}
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
			subtype: tank.subtype,
			reload: tank.label.reload,
			uid: tank.uid
		};
	}
};
var paint = {
	objects: [],
	drawn: {},
	mapOffset: undefined,
	drawRect: undefined,
	userScore: NaN,
	onPaint: function (packet) {
		var objects = [],
			objectsCount,
			offset,
			index,
			first;
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
		game.timeToReloadLeftFraction = packet.user.reload;

		objectsCount = objects.length;
		first = true;
		for(index = 0; index < objectsCount; index ++) {
			if(objects[index].type === 'tank') {
				if (first) {
					objects[index].label.reload = game.timeToReloadLeftFraction;
					first = false;
				} else {
					objects[index].label.reload = 0;
				}
			}
		}
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
		var newDrawn = {},
			objects = this.objects,
			orphanObjects = {},
			id;
		canvas.element.css (
			'background-position',
			(-this.mapOffset.x) + 'px' + ' ' +
			(-this.mapOffset.y) + 'px'
		);
		for (var i in this.drawn) {
			orphanObjects[i] = 0;
		}
		for (var i = 0; i < objects.length; i ++) {
			id = objects[i].type + objects[i].uid;
			if (this.drawn.hasOwnProperty (id)) {
				delete orphanObjects[id];
			} else {
				this.addObject (id, objects[i]);
			}
			this.updateObject (id, objects[i]);
			newDrawn[id] = objects[i];
		}
		for (var i in orphanObjects) {
			this.deleteObject (i);
		}
		this.drawn = newDrawn;
		this.drawScore(this.userScore);
	},
	drawScore: function (score) {
		$('#gameStatsScore').text(score);
	},
	drawLabel: function () {
	},
	addObject: function (id, object) {
		var element = $('<div>'),
			model = models.objects[object.type][object.subtype];
		element
			.attr ('id', id)
			.addClass ('absolute_position')
			.css (utils.CSSPrefixes (
				'transform-origin',
				(model.size.width/2 -
					model.center.x) +
					'px' +
				' ' +
				(model.size.length/2 -
					model.center.y) +
					'px'
			));
		console.log ('add', id, object);
		canvas.element.append (element);
		element = $('#' + id);
		element.html (
			models.objects[object.type][object.subtype].container.html()
		);
	},
	updateObject: function (id, object) {
		var element = $('#' + id),
			model = models.objects[object.type][object.subtype];
		//console.log ('upd', id, object);
		element
			.css (utils.CSSPrefixes (
				'transform',
				'translate(-50%, -50%) ' +
				'translate(' +
					model.center.x + 'px' + ', ' +
					model.center.y + 'px' +
				') ' +
				'translate(' +
					object.position.x + 'px' + ', ' +
					object.position.y + 'px' +
				') ' +
				'rotate(' +
					(object.rotation + 90) + 'deg' +
				')'
			))
	},
	deleteObject: function (id) {
		console.log ('del', id);
		$('#' + id).remove ();
	}
};