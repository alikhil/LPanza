var language = {
	languageId: undefined,
	defaultLanguageId: 'RU',
	DOM: {
		'#label_score_score': 'game.score',
		'#label_score_gameOver': 'game.game_over',
		'#label_score_playAgain': 'game.play_again',
		'#label_game_rating': 'game.rating',
		'#label_game_online': 'game.online',
		'#gameCanvas': 'app.no_canvas',
		'#label_error_error': 'app.error',
		'#label_error_dismiss': 'app.back',
		'#feedbackLink': 'app.feedback',
		'#label_feedback_title': 'feedback.title',
		'#label_feedback_text': 'feedback.text',
		'#feedbackBackButton': 'app.back',
		'#label_menu_play': 'menu.play',
		'#label_menu_name': 'menu.name',
		'#label_game_score': 'game.score',
		'#errorText': 'empty',
		'#errorTitle': 'empty'
	},
	init: function () {
		this.setLanguageId(this.defaultLanguageId);
		for(var index in this.strings) {
			$('#languageSelect').append(
				$('<option>')
					.text(this.strings[index]['language.label'])
					.val(index)
			);
		}
		$('#languageSelect')
			.val(this.defaultLanguageId)
			.on('change', function () {
				language.setLanguageId(
					$('#languageSelect').val()
				);
				language.updateDOM();
			});
		this.updateDOM();
	},
	updateDOM: function () {
		for(var index in this.DOM) {
			$(index).text(
				this.get(this.DOM[index])
			);
		}
	},
	setLanguageId: function (languageId) {
		if(!this.strings.hasOwnProperty(languageId)) {
			languageId = defaultLanguageId;
		}
		this.languageId = languageId;
	},
	setDOM: function (id, name) {
		if(id in this.DOM) {
			this.DOM[id] = name;
			$(id).text(
				this.get(name)
			);
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
			'game.score': 'Ваши очки',
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
			'error.join_fail_text.name_empty': 'Имя игрока не должно быть пустым'
		},
		'EN': {
			'language.label': 'EN',
			'language.invalid_name': 'Invalid string name',
			'empty': '',
			'game.game_over': 'Game over',
			'game.score': 'Your score',
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
			'error.join_fail_text.name_empty': 'Player`s name must not be empty'
		}
	}
};