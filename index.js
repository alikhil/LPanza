
var express = require('express');
var app = express();

var lpanza = require('./lpanza');

var port = 3228;

var loggers = require('intel');

loggers.config({
    formatters: {
        'simple': {
            'format': '[%(levelname)s] %(message)s',
            'colorize': true
        },
        'details': {
            'format': '[%(date)s] %(levelname)s: %(message)s',
            'strip': true
        }
    },
    handlers: {
        'terminal': {
            'class': loggers.handlers.Console,
            'formatter': 'simple',
            'level': loggers.VERBOSE
        },
        'logfile': {
            'class': loggers.handlers.File,
            'level': loggers.DEBUG,
            'file': 'server.log',
            'formatter': 'details'
        },
        'errors': {
            'class': loggers.handlers.File,
            'level': loggers.ERROR,
            'file': 'server_errors.log',
            'formatter': 'details'
        }
    },
    loggers: {
        'logger': {
            'handlers': ['terminal','logfile','errors'],
            'level': 'DEBUG',
            'handleExceptions': true,
            'exitOnError': false,
            'propagate': false
        }
    }
});


var server = require('http').createServer(app).listen(port);

var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/public'));

lpanza.startServer();

var logger = loggers.getLogger('logger');
logger.info('Server started on port ' + port);

io.on('connection', function(socket){
	lpanza.initGame(io, socket);
});


