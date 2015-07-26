(function () {
	var old_createElement = document.createElement,
		tags = ['svg', 'g', 'circle', 'rect', 'path', 'polygon', 'line', 'text'];
	document.createElement = function (tag) {
		return tags.indexOf (tag) != -1 ?
				document.createElementNS ('http://www.w3.org/2000/svg', tag)
			:
				old_createElement.call (document, tag);
	}
}) ();

var transform = {
	rotate: function (angle, size, center) {
		return '' +
			'rotate(' +
				angle + ' ' +
				(size.width/2+center.x) + ' ' +
				(size.length/2-center.y) +
			')';
	},
	relative: function (position) {
		return '' +
			'translate(' +
				position.x + ' ' +
				position.y +
			')';
	},
	inParent: function (size, center) {
		return '' +
			this.relative (
				utils.point (
					size.width/2,
					size.length/2
				)
			) + ' ' +
			this.relative (
				utils.point (
					-center.x,
					-center.y
				)
			);

	},
	toCenter: function (size, center) {
		return '' +
			this.relative (
				utils.point (
					-size.width/2,
					-size.length/2
				)
			) + ' ' +
			this.relative (center);
	}
};
var models = {
	objects: {},
	loadModels: function (models) {
		var containerContainer = $('#containerContainer'),
			container;
		this.objects = models;
		for(var type in this.objects) {
			for(var subtype in this.objects[type]) {
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
	addObject: function (id, object) {
		var svg = canvas.element,
			code = $('<g>');
		code.attr ('id', id);
		if (object.type === 'tank') {
			code.attr ('class', 'tank color_' + object.color);
			code.append (this.addHP (object));
		}
		code.append (
			$(this.addTexture (object))
				.attr ('class', object.type)
		);
		if (object.type === 'tank') {
			code.append (this.addTurret (object));
			code.append (this.addLabel (object));
		}
		canvas.element.append (code);
	},
	addLabel: function (object) {
		var model = models.objects[object.type][object.subtype],
			element = $('<text>');
		element
			.attr ('x', 0)
			.attr ('y', -utils.vectorLength (model.size.width, model.size.length) / 2)
			.attr ('text-anchor', 'middle')
			.attr ('class', 'label_')
			.append (
				document.createTextNode (
					''
				)
			);
		return element;
	},
	addTexture: function (object) {
		return $('#' + 'model_' + object.type + '_' + object.subtype + '_vector')[0]
			.children[0]
			.children[0]
			.cloneNode (true);
	},
	addTurret: function (object) {
		return $('<g>')
			.append (
				this.addReload (object)
			)
			.append (
				this.addTexture ({
					'type': 'turret',
					'subtype': object.subtype
				})
			)
			.attr ('class', 'turret');
	},
	addHP: function (object) {
		var model = models.objects[object.type][object.subtype];
		return $('<g>')
			.append (
				this
					.addRectangle (
						model.hp.size,
						utils.point (
							model.hp.size.width/2,
							model.hp.size.length/2
						)
					)
					.attr ('class', 'hp_back')
			)
			.append (
				this.addRectangle (
						utils.sizeWL (
							model.hp.size.width * object.label.hp/10,
							model.hp.size.length
						),
						utils.point (
							model.hp.size.width *
								object.label.hp / 20,
							model.hp.size.length/2
						)
					)
					.attr ('class', 'hp_front')
			)
			.attr (
				'transform',
				transform.inParent (
					model.size,
					model.hp.center
				) + ' ' +
				transform.toCenter (
					model.hp.size,
					utils.point (
						0,
						0
					)
				)
			)
			.attr ('class', 'hp');
	},
	addRectangle: function (size, position) {
		return $('<rect>')
			.attr ('x', position.x-size.width/2)
			.attr ('y', position.y-size.length/2)
			.attr ('width', size.width)
			.attr ('height', size.length);
	},
	addReload: function (object) {
		var model = models.objects['turret'][object.subtype],
			radius = model.reload.radius,
			angleA = 270,
			angleB = angleA + 360 * object.label.reload,
			longArc = (Math.abs (angleA - angleB) <= 180) ? 0 : 1,
			xa = radius*(1+Math.cos(utils.angleDegToRad(angleA))),
			ya = radius*(1+Math.sin(utils.angleDegToRad(angleA))),
			xb = radius*(1+Math.cos(utils.angleDegToRad(angleB))),
			yb = radius*(1+Math.sin(utils.angleDegToRad(angleB)));
		return $('<g>')
			.append (
				$('<circle>')
					.attr ('class', 'reload_back')
					.attr ('cx', radius)
					.attr ('cy', radius)
					.attr ('r', radius)
			)
			.append (
				$('<path>')
					.attr ('class', 'reload_front')
					.attr ('d', "M" + radius + "," + radius + " L" + xa + "," + ya + ", A" + radius + "," + radius + " 0 " + longArc + ",1 " + xb + "," + yb + " z")
			)
			.attr (
				'transform',
				transform.inParent (
					model.size,
					model.reload.center
				) + ' ' +
				transform.toCenter (
					utils.sizeWL (
						2*model.reload.radius,
						2*model.reload.radius
					),
					utils.point (
						0,
						0
					)
				)
			)
			.attr ('class', 'reload');
	},
	updateReload: function (id, object) {
		$('#' + id)
			.find ('.reload')
			.replaceWith (
				this.addReload (object)
			);
	},
	updateHP: function (id, object) {
		var model = models.objects[object.type][object.subtype];
		$('#' + id)
			.find ('.hp_front')
			.attr ('width', model.hp.size.width * object.label.hp/10);
	},
	updateLabel: function (id, object) {
		var model = models.objects[object.type][object.subtype],
			element = $('#' + id).find ('.label_');
		element
			.attr (
				'transform',
				transform.inParent (
					model.size,
					utils.point (0, 0)
				) + ' ' +
				transform.rotate (
					-object.rotation - 90,
					utils.sizeWL (0, 0),
					utils.point (0, 0)
				)
			);
		element[0].childNodes[0].data = object.label.userName + ' [' + object.label.hp + ' \u2764]';
	},
	addJoystick: function () {
		var code = $('<g>'),
			scale = game.paintRect.width / canvas.renderSize.width,
			center = controls.touch.touches.first[swipe.joy];
		center = utils.point (
			(center.x - canvas.renderOffset.x) * scale,
			(center.y - canvas.renderOffset.y) * scale
		);
		code
			.attr ('id', 'joystick')
			.attr ('class', 'joystick')
			.append (
				$('<circle>')
					.attr ('cx', 0)
					.attr ('cy', 0)
					.attr ('r', swipe.threshold * scale)
			)
			.append (
				$('<path>')
			)
			.attr (
				'transform',
				transform.relative (center)
			);
		canvas.element.append (code);
	},
	removeJoystick: function () {
		$('#joystick').remove ();
	},
	updateJoystick: function () {
		var a = controls.touch.touches.first[swipe.joy],
			b = controls.touch.touches.current[swipe.joy],
			scale = game.paintRect.width / canvas.renderSize.width,
			d = utils.vectorLength (b.x - a.x, b.y - a.y) * scale,
			al = paint.joystick.length * scale;
		$('#joystick')
			.find ('path')
			.attr ('d', 'M0,0 L0,' + d + ' l-' + al + ',-' + al + ' m' + al + ',' + al + ' l' + al + ',-' + al + ' z')
			.attr (
				'transform',
				transform.rotate (
					controls.acceleration.rotation-90,
					utils.sizeWL (
						0,
						0
					),
					utils.point (
						0,
						0
					)
				)
			);
	}
};
var paint = {
	objects: [],
	drawn: {},
	font: {
		label: 16
	},
	joystick: {
		width: 4,
		length: 10
	},
	mapOffset: undefined,
	drawRect: undefined,
	userScore: NaN,
	joystickDrawn: undefined,
	onPaint: function (packet) {
		var objects = [],
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

		first = true;
		for(index = 0; index < objects.length; index ++) {
			if(objects[index].type === 'tank') {
				if (first) {
					objects[index].label.reload = game.timeToReloadLeftFraction;
					first = false;
				} else {
					objects[index].label.reload = 0;
				}
			}
		}
		for(index = 0; index < objects.length; index ++) {
			objects[index].position.x -= offset.x;
			objects[index].position.y -= offset.y;
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
		if (swipe.joyIs) {
			if (!this.joystickDrawn) {
				models.addJoystick ();
				this.joystickDrawn = true;
			}
			models.updateJoystick ();
		} else {
			if (this.joystickDrawn) {
				models.removeJoystick ();
			}
			this.joystickDrawn = false;
		}
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
	addObject: function (id, object) {
		models.addObject (id, object);
	},
	updateObject: function (id, object) {
		var element = $('#' + id),
			model = models.objects[object.type][object.subtype];
		//console.log ('upd', id, object);
		element
			.attr (
				'transform',
				transform.toCenter (
					model.size,
					model.center
				) + ' ' +
				transform.relative (
					object.position
				) + ' ' +
				transform.rotate (
					object.rotation + 90,
					model.size,
					model.center
				)
			);
		if (object.type === 'tank') {
			var model2 = models.objects['turret'][object.subtype];
			models.updateReload (id, object);
			models.updateHP (id, object);
			models.updateLabel (id, object);
			element.find ('.turret')
				.attr (
					'transform',
					transform.inParent (
						model.size,
						model.turretCenter
					) + ' ' +
					transform.toCenter (
						model2.size,
						model2.center
					) + ' ' +
					transform.rotate (
						object.turret.rotation-object.rotation,
						model2.size,
						model2.center
					)
				);
		}
	},
	deleteObject: function (id) {
		console.log ('del', id);
		$('#' + id).remove ();
	},
	updateFonts: function (scale) {
		$('#fontStyles')
			.html (
				'#gameCanvas .label_ {' +
					'font-size:' +
						(this.font.label * scale) + 'px' +
						';' +
				'}' + ' ' +
				'#gameCanvas .joystick {' +
					'stroke-width:' +
						(this.joystick.width * scale) +
						';' +
				'}'
			);
	}
};