exports.init = initFeedback;

function initFeedback (socket) {
	socket.on('game.feedback', function (packet) {
		// привести к типу string
		var email = packet.email + '',
			message = packet.message + '',
			reason,
			reasons = {
				emptyEmail: 'Введите Ваш email',
				emptyMessage: 'Введите сообщение'
			},
			success = false;
		if(email.length > 0) {
			if(message.length > 0) {
				var result = sendFeedback(email, message);
				success = result.success;
				if(!success) {
					reason = result.reason;
				}
			} else {
				reason = reasons.emptyMessage;
			}
		} else {
			reason = reasons.emptyEmail;
		}
		if(success) {
			socket.emit('game.feedback.ok', {});
		} else {
			socket.emit('game.feedback.fail', {
				reason: reason
			});
		}
	});
}


function sendFeedback (email, message) {
	console.log('email:', email, ', message:', message)
	return {
		success: false,
		reason: 'Функция отправки обратной связи не работает (в разработке)'
	};
}