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

var sound = {
	load: function () {
		for (var i in this.audio) {
			try {
				this.audio[i] = new Audio (this.audio[i]);
			} catch (e) {
				this.audio[i] = {
					play: function () {},
					pause: function () {},
					load: function () {},
					cloneNode: function () {
						return this;
					},
					loop: false,
					muted: false
				};
			}
		}
	},
	audio: {
		tankDriving: 'tankDriving.mp3',
		gunShot: 'gunShot.mp3'
	},
	objects: {},
	muted: false,
	mute: function (mute) {
		for (var i in this.objects) {
			this.objects[i].audio.muted = mute;
		}
		this.muted = mute;
	}
};
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
	layers: {
		tank: 'tank',
		bullet: 'bullet'
	},
	loadModels: function (models) {
		var containerContainer = $('#containerContainer'),
			container;
		this.objects = models;
		for(var type in this.objects) {
			for(var subtype in this.objects[type]) {
				this.objects[type][subtype].container = $('#' + 'model_' + type + '_' + subtype + '_vector');
				$(this.objects[type][subtype].container[0].childNodes[1])
					.attr ('width', this.objects[type][subtype].size.width)
					.attr ('height', this.objects[type][subtype].size.length);
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
		var element = canvas.layers[this.layers[object.type]],
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
			this.addTurret (id, object);
			this.addLabel (id, object);
		}
		element.append (code);
		object.dom.self = code;
	},
	addLabel: function (id, object) {
		var model = models.objects[object.type][object.subtype],
			scale = canvas.scale;
		canvas.layers.label.append (
			object.dom.label_placeholder =
			$('<g>')
				.attr ('id', 'label_' + id)
				.append (
					object.dom.label_ =
					$('<g>')
						.append (
							object.dom.label_back =
							$('<rect>')
								.attr ('class', 'label_back')
						)
						.append (
							object.dom.label_front =
							$('<text>')
								.attr ('x', 0)
								.attr ('y',
									-utils.vectorLength (
										model.size.width,
										model.size.length
									) / 2
								)
								.attr ('text-anchor', 'middle')
								.append (
									document.createTextNode (
										''
									)
								)
								.attr ('class', 'label_front')
						)
						.attr ('class', 'label_')
				)
		);
	},
	addTexture: function (object) {
		return this.objects[object.type][object.subtype].container[0]
			.children[0]
			.cloneNode (true);
	},
	addTurret: function (id, object) {
		canvas.layers.turret.append (
			object.dom.turret_placeholder =
			$('<g>')
				.attr ('id', 'turret_' + id)
				.append (
					object.dom.turret =
					$('<g>')
						.append (
							this.addReload (object)
						)
						.append (
							this.addTexture ({
								'type': 'turret',
								'subtype': object.subtype
							})
						)
						.attr ('class', 'turret tank color_' + object.color)
				)
		);
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
				object.dom.hp_front =
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
			radius = model.reload.radius;
		return $('<g>')
			.append (
				$('<circle>')
					.attr ('class', 'reload_back')
					.attr ('cx', radius)
					.attr ('cy', radius)
					.attr ('r', radius)
			)
			.append (
				object.dom.reload_front =
				$('<path>')
					.attr ('class', 'reload_front')
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
		if (object.old.label.reload != object.label.reload) {
			var model = models.objects['turret'][object.subtype],
				radius = model.reload.radius,
				angleA = 270,
				angleB = angleA + 360 * object.label.reload,
				longArc = (Math.abs (angleA - angleB) <= 180) ? 0 : 1,
				xa = radius * (1 + Math.cos (utils.angleDegToRad (angleA))),
				ya = radius * (1 + Math.sin (utils.angleDegToRad (angleA))),
				xb = radius * (1 + Math.cos (utils.angleDegToRad (angleB))),
				yb = radius * (1 + Math.sin (utils.angleDegToRad (angleB)));
			object.dom.reload_front
				.attr ('d', 'M' + radius + ',' + radius + ' L' + xa + ',' + ya + ', A' + radius + ',' + radius + ' 0 ' + longArc + ',1 ' + xb + ',' + yb + ' z');
			object.old.label.reload = object.label.reload;
		}
	},
	updateHP: function (id, object) {
		var model = models.objects[object.type][object.subtype];
		// if object.old.hp != object.label.hp
		object.dom.hp_front
			.attr ('width', model.hp.size.width * object.label.hp/10);
	},
	updateLabel: function (id, object) {
		var model = models.objects[object.type][object.subtype],
			text = object.dom.label_front,
			back = object.dom.label_back,
			size,
			scale = canvas.scale,
			padding = paint.labelPadding / scale,
			deltaTop = utils.vectorLength (
				model.size.width,
				model.size.length
			) / 2 +
				text[0].offsetHeight +
				canvas.renderCropSize.height / 2;
		size = text[0].getBBox ();
		object.dom.label_
			//	if object.old.rotation != object.rotation
			//		|| object.old.top != object.top
			//		|| scale_changed
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
				) +
				(object.position.y < deltaTop ?
					' ' +
					transform.relative (
						utils.point (
							0,
							utils.vectorLength (
								model.size.width,
								model.size.length
							) +
								size.height -
								padding
						)
					)
				:
					''
				)
			);
		// if object.old.hp != object.label.hp
		text[0].childNodes[0].data = object.label.userName + ' [' + object.label.hp + ' \u2764]';
		size = text[0].getBBox ();
		//	if object.old.hp != object.label.hp
		//		|| scale_changed
		back
			.attr ('y', size.y - padding)
			.attr ('x', -size.width / 2 - padding)
			.attr ('width', size.width + 2 * padding)
			.attr ('height', size.height + 2 * padding);
	},
	addJoystick: function () {
		var code = $('<g>'),
			scale = canvas.scale,
			center = controls.touch.touches.first[swipe.joy];
		center = utils.point (
			center.x / scale,
			center.y / scale
		);
		code
			.attr ('id', 'joystick')
			.attr ('class', 'joystick')
			.append (
				$('<circle>')
					.attr ('cx', 0)
					.attr ('cy', 0)
					.attr ('r', swipe.threshold / scale)
			)
			.append (
				paint.dom.joystick_arrow =
				$('<path>')
			)
			.attr (
				'transform',
				transform.relative (center)
			);
		paint.dom.joystick = code;
		canvas.layers.joystick.append (code);
	},
	removeJoystick: function () {
		paint.dom.joystick.remove ();
	},
	updateJoystick: function () {
		var a = controls.touch.touches.first[swipe.joy],
			b = controls.touch.touches.current[swipe.joy],
			scale = canvas.scale,
			d = utils.vectorLength (b.x - a.x, b.y - a.y) / scale,
			al = paint.joystick.length / scale;
		//	if old.length != d.length
		//		|| old.rotation != rotation
		paint.dom.joystick_arrow
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
	dom: {},
	objects: [],
	drawn: {},
	font: {
		label: 16
	},
	labelPadding: 5,
	joystick: {
		width: 4,
		length: 10
	},
	mapOffset: undefined,
	drawRect: undefined,
	userScore: NaN,
	joystickDrawn: undefined,
	animation: {
		gun_shot: function (tankId) {
			$('#turret_' + tankId)
				.find ('.gun_shot_animation')[0]
				.beginElement ();
		}
	},
	onPaint: function (packet) {
		var objects = [],
			offset,
			index,
			first;
		//console.log(JSON.stringify(packet));
		this.objects.splice(0, this.objects.length);
		objects = packet.objects;

		if (objects[0].position.x +
				canvas.renderVisibleSize.width / 2 >
				game.mapSize.width) {
			game.tankCenter.x = objects[0].position.x +
				game.paintRect.width -
				canvas.renderCropSize.width / 2 -
				game.mapSize.width;
		} else if (objects[0].position.x < canvas.renderVisibleSize.width / 2) {
			game.tankCenter.x = canvas.renderCropSize.width / 2 + objects[0].position.x;
		} else {
			game.tankCenter.x = game.paintRect.width / 2;
		}
		if (objects[0].position.y +
				canvas.renderVisibleSize.height / 2 >
				game.mapSize.height) {
			game.tankCenter.y = objects[0].position.y +
				game.paintRect.height -
				canvas.renderCropSize.height / 2 -
				game.mapSize.height;
		} else if (objects[0].position.y < canvas.renderVisibleSize.height / 2) {
			game.tankCenter.y = canvas.renderCropSize.height / 2 + objects[0].position.y;
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
			id,
			events = [];
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
		//	if old.mapOffset.x != mapOffset.x
		//		|| old.mapOffset.y != mapOffset.y
		canvas.element.css (
			'background-position',
			(-this.mapOffset.x) + 'px' + ' ' +
			(-this.mapOffset.y) + 'px'
		);
		for (var i in this.drawn) {
			orphanObjects[i] = 0;
		}
		for (var i = 0; i < objects.length; i ++) {
			if (objects[i].type === 'event') {
				events.push (objects[i]);
			} else {
				var keep;
				id = objects[i].type + objects[i].uid;
				if (this.drawn.hasOwnProperty (id)) {
					delete orphanObjects[id];
					keep = this.drawn[id];
				} else {
					keep = {old: {label: {reload: NaN}}, dom: {}};
					objects[i].old = keep.old;
					objects[i].dom = keep.dom;
					this.addObject (id, objects[i]);
				}
				objects[i].old = keep.old;
				objects[i].dom = keep.dom;
				this.updateObject (id, objects[i]);
				newDrawn[id] = objects[i];
			}
		}
		for (var i = 0; i < events.length; i ++) {
			var event = events[i];
			if (event.subtype === 'gun_shot') {
				var soundObject = {},
					id = Math.floor (Math.random () * 100000);
				soundObject.audio = sound.audio.gunShot.cloneNode ();
				soundObject.audio.muted = sound.muted;
				sound.objects['gunShot_' + id] = soundObject;
				soundObject.audio.play ();
				this.animation.gun_shot ('tank' + event.uid);
			}
		}
		for (var i in orphanObjects) {
			this.deleteObject (i, this.drawn[i]);
		}
		this.drawn = newDrawn;
		this.drawScore(this.userScore);
	},
	reset: function () {
		this.objects = [];
		this.repaint ();
		this.joystickDrawn = false;
	},
	drawScore: function (score) {
		// if old.score != score
		language.setDOM (
			'#gameStatsScore',
			'game.score', {
				'%score%': score
			}
		);
	},
	addObject: function (id, object) {
		models.addObject (id, object);
		if (object.type === 'tank') {
			var soundObject = {};
			soundObject.active = false;
			soundObject.audio = sound.audio.tankDriving.cloneNode ();
			soundObject.audio.loop = true;
			soundObject.audio.muted = sound.muted;
			sound.objects['drivingTank_' + id] = soundObject;
		}
	},
	updateObject: function (id, object) {
		var element = object.dom.self,
			model = models.objects[object.type][object.subtype];
		//console.log ('upd', id, object);
		if (object.type === 'tank') {
			var soundObject = sound.objects['drivingTank_' + id];
			if (soundObject.active != object.drivingFlag) {
				if (object.drivingFlag) {
					soundObject.audio.play ();
				} else {
					soundObject.audio.pause ();
				}
				soundObject.active = object.drivingFlag;
			}
			element = element
				.add (object.dom.label_placeholder)
				.add (object.dom.turret_placeholder);
		}
		//	if object.old.rotation != object.rotation
		//		|| object.old.position.x != object.position.x
		//		|| object.old.position.y != object.position.y
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
			//	if object.old.turret_rotation != object.turret.rotation
			object.dom.turret
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
	deleteObject: function (id, object) {
		console.log ('del', id);
		object.dom.self.remove ();
		if (id.substr (0, 4) === 'tank') {
			object.dom.label_placeholder.remove ();
			object.dom.turret_placeholder.remove ();
			sound.objects['drivingTank_' + id].audio.pause ();
			delete sound.objects['drivingTank_' + id];
		}
	},
	updateFonts: function (scale) {
		$('#fontStyles')
			.html (
				'#gameCanvas .label_front {' +
					'font-size:' +
						(this.font.label / scale) + 'px' +
						';' +
				'}' + ' ' +
				'#gameCanvas .joystick {' +
					'stroke-width:' +
						(this.joystick.width / scale) +
						';' +
				'}'
			);
	}
};