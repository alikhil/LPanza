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
                var result = sendFeedback(email, message, function (result) {
                    success = result.success;
                    if (!success) {
                        reason = result.reason;
                    }
                    if (success) {
                        socket.emit('game.feedback.ok', {});
                    } else {
                        socket.emit('game.feedback.fail', {
                            reason: reason
                        });
                    }
                });
				
			} else {
                reason = reasons.emptyMessage;
                if (success) {
                    socket.emit('game.feedback.ok', {});
                } else {
                    socket.emit('game.feedback.fail', {
                        reason: reason
                    });
                }
			}
		} else {
            reason = reasons.emptyEmail;
            if (success) {
                socket.emit('game.feedback.ok', {});
            } else {
                socket.emit('game.feedback.fail', {
                    reason: reason
                });
            }
		}
		
	});
}

var nodemailer = require('nodemailer');

function sendFeedback (email, message, callBack) {
    console.log('email:', email, ', message:', message);
    var success = true, error;

    var ses = require('nodemailer-ses-transport');
    var transporter = nodemailer.createTransport(ses({
        accessKeyId: 'AKIAIQ3M6FM7J5JYD7IA',
        secretAccessKey: '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'
    }));
    transporter.sendMail({
        from: email,
        to: 'alikhil@mail.ru',
        subject: '#Bag report',
        text: message
    }, 
         function (err,info){
        if (err !== undefined) {
            error = err.message;
            success = false;
        }
        callBack( {
            success: success,
            reason: error
        });
    }
    );
    
}