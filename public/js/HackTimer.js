var hackTimer = {
	worker: undefined,
	fakeIdToCallback: {},
	init: function () {
		if(typeof(Worker) !== 'undefined') {
			hackTimer.worker = new Worker('./js/HackTimerWorker.js');
			function getFakeId (prefix) {
				return prefix + Math.floor(
					Math.random() *
					Number.MAX_VALUE
				);
			}
			window.setInterval = function (callback, time) {
				var fakeId = getFakeId('i-');
				hackTimer.fakeIdToCallback[fakeId] = callback;
				hackTimer.worker.postMessage({
					name: 'setInterval',
					fakeId: fakeId,
					time: time
				});
				return fakeId;
			};
			window.clearInterval = function (fakeId) {
				delete hackTimer.fakeIdToCallback[fakeId];
				hackTimer.worker.postMessage({
					name: 'clearInterval',
					fakeId: fakeId
				});
			};
			window.setTimeout = function (callback, time) {
				var fakeId = getFakeId('t-');
				hackTimer.fakeIdToCallback[fakeId] = callback;
				hackTimer.worker.postMessage({
					name: 'setTimeout',
					fakeId: fakeId,
					time: time
				});
				return fakeId;
			};
			window.clearTimeout = function (fakeId) {
				delete hackTimer.fakeIdToCallback[fakeId];
				hackTimer.worker.postMessage({
					name: 'clearTimeout',
					fakeId: fakeId
				});
			};
			hackTimer.worker.onmessage = function (event) {
				var data = event.data,
					fakeId = data.fakeId,
					callback = hackTimer.fakeIdToCallback[fakeId];
				callback.call(window);
			};
			hackTimer.worker.onerror = function (event) {
				console.log(event);
			};
		} else {
			console.log('HackTimer by Tushov Ruslan: HTML5 Web Worker is not supported');
		}
	}
}
hackTimer.init();