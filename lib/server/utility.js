'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports.clone = clone;
exports.deferred = deferred;
exports.merge = merge;
exports.uuid = uuid;

function clone(arg) {
	return JSON.parse(JSON.stringify(arg));
}

function deferred() {
	var promise = undefined,
	    resolver = undefined,
	    rejecter = undefined;

	promise = new Promise(function (resolve, reject) {
		resolver = resolve;
		rejecter = reject;
	});

	return { resolve: resolver, reject: rejecter, promise: promise };
}

function merge(a, b) {
	var c = clone(a);
	var d = clone(b);

	Object.keys(d).forEach(function (i) {
		c[i] = d[i];
	});

	return c;
}

var r = [8, 9, 'a', 'b'];

function s() {
	return ((1 + Math.random()) * 65536 | 0).toString(16).substring(1);
}

function uuid() {
	return s() + s() + '-' + s() + '-4' + s().substr(0, 3) + '-' + r[Math.floor(Math.random() * 4)] + s().substr(0, 3) + '-' + s() + s() + s();
}
//# sourceMappingURL=utility.js.map