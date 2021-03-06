var language = {
	languageId: undefined,
	defaultLanguageId: 'RU',
	handlers: undefined,
	DOM: {
		'#label_score_score': {name: 'game.score_word', data: {'%score%': ''}},
		'#label_score_gameOver': {name: 'game.game_over', data: {}},
		'#playAgainButton': {name: 'game.play_again', data: {}},
		'#label_error_error': {name: 'app.error', data: {}},
		'#label_error_dismiss': {name: 'app.back', data: {}},
		'#feedbackShowButton': {name: 'app.feedback', data: {}},
		'#label_feedback_title': {name: 'feedback.title', data: {}},
		'#label_feedback_text': {name: 'feedback.text', data: {}},
		'#feedbackBackButton': {name: 'app.back', data: {}},
		'#label_menu_play': {name: 'menu.play', data: {}},
		'#label_menu_name': {name: 'menu.name', data: {}},
		'#errorText': {name: 'empty', data: {}},
		'#errorTitle': {name: 'empty', data: {}},
		'#label_menu_room': {name: 'menu.room', data: {}},
		'#label_game_room_id': {name: 'menu.room', data: {}},
		'#label_online_list_title': {name: 'game.online', data: {}},
		'#onlineListBackButton': {name: 'app.back', data: {}},
		'#label_bad_browser_title': {name: 'app.error', data: {}},
		'#label_bad_browser_text_1_line': {name: 'bad_browser.text_1_line', data: {}},
		'#label_bad_browser_text_2_line': {name: 'bad_browser.text_2_line', data: {}},
		'#gameRoomIdText': {name: 'game.room_id', data: {}},
		'#gameStatsPing': {name: 'game.stats_ping', data: {'%time%': 0}},
		'#gameStatsScore': {name: 'game.score', data: {'%score%': 0}}
	},
	init: function () {
		this.setLanguageId(this.defaultLanguageId);
		$('.languageSelect').empty ();
		for(var language_ in this.strings) {
			$('.languageSelect').append(
				$('<option>')
					.text(this.strings[language_]['language.label'])
					.val(language_)
			);
		}
		$('.languageSelect')
			.val(this.defaultLanguageId)
			.on('change', function () {
				var val = $(this).val ();
				language.setLanguageId (val);
				$('.languageSelect').val (val);
				language.updateDOM();
				resizeOnlineButtonPadding ();
				for (var i = 0; i < language.handlers.length; i ++) {
					language.handlers[i]();
				}
			})
			.show ();
		this.handlers = [];
		this.updateDOM();
	},
	on: function (event, handler) {
		if (event === 'change') {
			this.handlers.push (handler);
		}
	},
	off: function (event) {
		if (event === 'change') {
			if (this.handlers.length > 0) {
				this.handlers.pop ();
			}
		}
	},
	updateDOM: function () {
		for(var index in this.DOM) {
			this.updateDOMSingle (index);
		}
	},
	expand: function (name, data) {
		var formated = this.get (name);
		for (i in data) {
			formated = formated.replace (i, data[i]);
		}
		return formated;
	},
	updateDOMSingle: function (id) {
		var value = this.DOM[id];
		$(id).text (
			this.expand (
				value.name,
				value.data
			)
		);
	},
	setLanguageId: function (languageId) {
		if(!this.strings.hasOwnProperty(languageId)) {
			languageId = defaultLanguageId;
		}
		this.languageId = languageId;
	},
	setDOM: function (id, name, data) {
		if(id in this.DOM) {
			this.DOM[id] = {
				name: name,
				data: data !== undefined ? data : {}
			};
			this.updateDOMSingle (id);
		}
	},
	get: function (name) {
		if(!this.strings[this.languageId].hasOwnProperty(name)) {
			name = 'language.language_invalid_name';
		}
		return this.strings[this.languageId][name];
	},
	strings: {
		'RU': {
			'language.label': 'RU',
			'language.invalid_name': 'Неправильное имя строки',
			'empty': '',
			'game.game_over': 'Игра окончена',
			'game.score': 'Ваши очки %score%',
			'game.score_word': 'Ваши очки',
			'game.play_again': 'Играть еще',
			'game.rating': 'Рейтинг',
			'game.online': 'Онлайн',
			'app.no_canvas': 'HTML5 не поддерживается',
			'app.error': 'Ошибка',
			'app.back': 'Назад',
			'app.feedback': 'Обратная связь',
			'feedback.title': 'Обратная связь',
			'feedback.text': 'По вопросам и предложениям пишите на почтовый ящик',
			'menu.play': 'Играть',
			'menu.name': 'Ваше имя',
			'game.join_fail_title': 'Не могу присоединится к игре',
			'game.stats_ping': '%time% мс',
			'game.rating_element': '%order%.%name% - %score%',
			'error.disconnect_title': 'Потеряно соединение с сервером',
			'error.disconnect_text': 'Обновите страницу',
			'error.join_fail_text.max_user_count_exceeded': 'Достигнут лимит игроков. Подождите пока сервер освободится',
			'error.join_fail_text.name_too_long': 'Имя игрока должно состоять не более чем из %count% символов',
			'error.join_fail_text.name_empty': 'Имя игрока не должно быть пустым',
			'menu.room': 'Комната',
			'menu.room_element': '#%id% - %used% / %total%',
			'error.join_fail_text.room_overload': 'Достигнут лимит игроков. Подождите пока комната освободится',
			'error.join_fail_text.room_does_not_exist': 'Выбрана несуществующая комната',
			'game.room_id': '#%id%',
			'game.online_element': '%name%',
			'bad_browser.text_1_line': 'Вы используете устаревший браузер',
			'bad_browser.text_2_line': 'Для работы сайта необходимо установить современный браузер',
			'share.score_title': 'Last Panzer',
			'share.score_text': 'Я набрал %score% очков в игре Last Panzer, сколько наберешь ты?'
		},
		'EN': {
			'language.label': 'EN',
			'language.invalid_name': 'Invalid string name',
			'empty': '',
			'game.game_over': 'Game over',
			'game.score': 'Your score %score%',
			'game.score_word': 'Your score',
			'game.play_again': 'Play again',
			'game.rating': 'Rating',
			'game.online': 'Online',
			'app.no_canvas': 'HTML5 is not supported',
			'app.error': 'Error',
			'app.back': 'Back',
			'app.feedback': 'Feedback',
			'feedback.title': 'Feedback',
			'feedback.text': 'If you have got questions or suggestions send e-mail to',
			'menu.play': 'Play',
			'menu.name': 'Your name',
			'game.join_fail_title': 'Can not join the game',
			'game.stats_ping': '%time% ms',
			'game.rating_element': '%order%.%name% - %score%',
			'error.disconnect_title': 'Connection to the server is lost',
			'error.disconnect_text': 'Reload the page',
			'error.join_fail_text.max_user_count_exceeded': 'Maximum user count reached. Wait for server to be freed',
			'error.join_fail_text.name_too_long': 'Player`s name length must not exceed %count% symbols',
			'error.join_fail_text.name_empty': 'Player`s name must not be empty',
			'menu.room': 'Room',
			'menu.room_element': '#%id% - %used% / %total%',
			'error.join_fail_text.room_overload': 'Maximum user count reached. Wait for room to be freed',
			'error.join_fail_text.room_does_not_exist': 'Chosen room does not exist',
			'game.room_id': '#%id%',
			'game.online_element': '%name%',
			'bad_browser.text_1_line': 'Your browser is out of date',
			'bad_browser.text_2_line': 'Please upgrade your browser to view this site',
			'share.score_title': 'Last Panzer',
			'share.score_text': 'I have scored %score% points playing Last Panzer game, how much can you?'
		}
	}
};