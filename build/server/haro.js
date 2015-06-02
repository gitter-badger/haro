'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _tinyTuple = require('tiny-tuple');

var _tinyTuple2 = _interopRequireDefault(_tinyTuple);

var _utility = require('./utility');

var Haro = (function () {
	function Haro(data) {
		_classCallCheck(this, Haro);

		this.data = new Map();
		this.config = {
			method: 'get',
			credentials: false,
			headers: {
				accept: 'application/json',
				'content-type': 'application/json'
			}
		};
		this.registry = [];
		this.key = '';
		this.source = '';
		this.total = 0;
		this.uri = '';
		this.versions = new Map();

		if (data) {
			this.batch(data, 'set');
		}
	}

	_createClass(Haro, [{
		key: 'batch',
		value: function batch(args, type) {
			var _this = this;

			var defer = (0, _utility.deferred)();
			var promises = [];

			if (type === 'del') {
				args.forEach(function (i) {
					promises.push(_this.del(i, true));
				});
			} else {
				args.forEach(function (i) {
					promises.push(_this.set(null, i, true));
				});
			}

			Promise.all(promises).then(function (arg) {
				defer.resolve(arg);
			}, function (e) {
				defer.reject(e);
			});

			return defer.promise;
		}
	}, {
		key: 'clear',
		value: function clear() {
			this.total = 0;
			this.registry = [];
			this.data.clear();
			this.versions.clear();

			return this;
		}
	}, {
		key: 'del',
		value: function del(key) {
			var _this2 = this;

			var batch = arguments[1] === undefined ? false : arguments[1];

			var defer = (0, _utility.deferred)();

			var next = function next() {
				var index = _this2.registry.indexOf(key);

				if (index > -1) {
					if (index === 0) {
						_this2.registry.shift();
					} else if (index === _this2.registry.length - 1) {
						_this2.registry.pop();
					} else {
						_this2.registry.splice(index, 1);
					}

					_this2.data['delete'](key);
					_this2.versions['delete'](key);
					--_this2.total;
				}

				defer.resolve();
			};

			if (this.data.has(key)) {
				if (!batch && this.uri) {
					this.request(this.uri.replace(/\?.*/, '') + '/' + key, { method: 'delete' }).then(next, function (e) {
						defer.reject(e[0] || e);
					});
				} else {
					next();
				}
			} else {
				defer.reject(new Error('Record not found'));
			}

			return defer.promise;
		}
	}, {
		key: 'entries',
		value: function entries() {
			return this.data.entries();
		}
	}, {
		key: 'filter',
		value: function filter(fn) {
			var result = [];

			this.forEach(function (value, key) {
				if (fn((0, _utility.clone)(value), (0, _utility.clone)(key)) === true) {
					result.push((0, _tinyTuple2['default'])(key, value));
				}
			});

			return _tinyTuple2['default'].apply(_tinyTuple2['default'], result);
		}
	}, {
		key: 'forEach',
		value: function forEach(fn, ctx) {
			return this.data.forEach(fn, ctx);
		}
	}, {
		key: 'get',
		value: function get(key) {
			var output = undefined;

			if (this.data.has(key)) {
				output = (0, _tinyTuple2['default'])(key, this.data.get(key));
			}

			return output;
		}
	}, {
		key: 'keys',
		value: function keys() {
			return this.data.keys();
		}
	}, {
		key: 'limit',
		value: function limit() {
			var start = arguments[0] === undefined ? 0 : arguments[0];
			var offset = arguments[1] === undefined ? 0 : arguments[1];

			var i = start;
			var nth = start + offset;
			var list = [];
			var k = undefined;

			if (i < 0 || i >= nth) {
				throw new Error('Invalid range');
			}

			do {
				k = this.registry[i];

				if (k) {
					list.push(this.get(k));
				}
			} while (++i < nth);

			return _tinyTuple2['default'].apply(_tinyTuple2['default'], list);
		}
	}, {
		key: 'map',
		value: function map(fn) {
			var result = [];

			this.forEach(function (value, key) {
				result.push((0, _tinyTuple2['default'])(key, fn((0, _utility.clone)(value), (0, _utility.clone)(key))));
			});

			return _tinyTuple2['default'].apply(_tinyTuple2['default'], result);
		}
	}, {
		key: 'request',
		value: function request(input) {
			var config = arguments[1] === undefined ? {} : arguments[1];

			var cfg = (0, _utility.merge)(this.config, config);

			return (0, _nodeFetch2['default'])(input, cfg).then(function (res) {
				return res[res.headers.get('content-type').indexOf('application/json') > -1 ? 'json' : 'text']().then(function (arg) {
					if (res.status === 0 || res.status >= 400) {
						throw (0, _tinyTuple2['default'])(arg, res.status);
					}

					return (0, _tinyTuple2['default'])(arg, res.status);
				}, function (e) {
					throw (0, _tinyTuple2['default'])(e.message, res.status);
				});
			}, function (e) {
				throw (0, _tinyTuple2['default'])(e.message, 0);
			});
		}
	}, {
		key: 'set',
		value: function set(key, data) {
			var _this3 = this;

			var batch = arguments[2] === undefined ? false : arguments[2];
			var override = arguments[3] === undefined ? false : arguments[3];

			var defer = (0, _utility.deferred)();
			var method = 'post';
			var lkey = (0, _utility.clone)(key === undefined ? null : key);
			var ldata = (0, _utility.clone)(data);

			var next = function next() {
				if (method === 'post') {
					++_this3.total;
					_this3.registry.push(lkey);
					_this3.versions.set(lkey, new Set());
				} else {
					_this3.versions.get(lkey).add((0, _tinyTuple2['default'])(_this3.data.get(lkey)));
				}

				_this3.data.set(lkey, ldata);
				defer.resolve(_this3.get(lkey));
			};

			if (lkey === undefined || lkey === null) {
				lkey = this.key ? ldata[this.key] : (0, _utility.uuid)() || (0, _utility.uuid)();
			} else if (this.data.has(lkey)) {
				method = 'put';

				if (!override) {
					ldata = (0, _utility.merge)(this.get(lkey)[1], ldata);
				}
			}

			if (!batch && this.uri) {
				this.request(this.uri.replace(/\?.*/, '') + '/' + lkey, { method: method, body: JSON.stringify(ldata) }).then(next, function (e) {
					defer.reject(e[0] || e);
				});
			} else {
				next();
			}

			return defer.promise;
		}
	}, {
		key: 'setUri',
		value: function setUri(uri) {
			var _this4 = this;

			var defer = (0, _utility.deferred)();

			this.uri = uri;

			if (this.uri) {
				this.request(this.uri).then(function (arg) {
					var data = arg[0];

					if (_this4.source) {
						try {
							_this4.source.split('.').forEach(function (i) {
								data = data[i];
							});
						} catch (e) {
							return defer.reject(e);
						}
					}

					_this4.batch(data, 'set').then(function (records) {
						defer.resolve(records);
					}, function (e) {
						defer.reject(e);
					});
				}, function (e) {
					defer.reject(e[0] || e);
				});
			} else {
				defer.resolve();
			}

			return defer.promise;
		}
	}, {
		key: 'values',
		value: function values() {
			return this.data.values();
		}
	}]);

	return Haro;
})();

exports.Haro = Haro;
//# sourceMappingURL=haro.js.map