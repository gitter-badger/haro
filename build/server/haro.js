"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _deps = require("./deps");

var _utility = require("./utility");

var Haro = (function () {
	function Haro(data) {
		_classCallCheck(this, Haro);

		this.data = new _deps.Map();
		this.config = {
			method: "get",
			credentials: false,
			headers: {
				accept: "application/json",
				"content-type": "application/json"
			}
		};
		this.registry = [];
		this.key = "";
		this.source = "";
		this.total = 0;
		this.uri = "";
		this.versions = new _deps.Map();

		if (data) {
			this.batch(data, "set");
		}
	}

	_createClass(Haro, [{
		key: "batch",
		value: function batch(args, type) {
			var _this = this;

			var defer = (0, _utility.deferred)(),
			    promises = [];

			if (type === "del") {
				args.forEach(function (i) {
					promises.push(_this.del(i, true));
				});
			} else {
				args.forEach(function (i) {
					promises.push(_this.set(null, i, true));
				});
			}

			_deps.Promise.all(promises).then(function (arg) {
				defer.resolve(arg);
			}, function (e) {
				defer.reject(e);
			});

			return defer.promise;
		}
	}, {
		key: "clear",
		value: function clear() {
			this.total = 0;
			this.registry = [];
			this.data.clear();
			this.versions.clear();

			return this;
		}
	}, {
		key: "del",
		value: function del(key) {
			var _this2 = this;

			var batch = arguments[1] === undefined ? false : arguments[1];

			var defer = (0, _utility.deferred)(),
			    index = undefined;

			var next = function next() {
				index = _this2.registry.indexOf(key);

				if (index > -1) {
					if (index === 0) {
						_this2.registry.shift();
					} else if (index === _this2.registry.length - 1) {
						_this2.registry.pop();
					} else {
						_this2.registry.splice(index, 1);
					}

					_this2.data["delete"](key);
					_this2.versions["delete"](key);
					--_this2.total;
				}

				defer.resolve();
			};

			if (this.data.has(key)) {
				if (!batch && this.uri) {
					this.request(this.uri.replace(/\?.*/, "") + "/" + key, { method: "delete" }).then(next, function (e) {
						defer.reject(e[0] || e);
					});
				} else {
					next();
				}
			} else {
				defer.reject(new Error("Record not found"));
			}

			return defer.promise;
		}
	}, {
		key: "entries",
		value: function entries() {
			return this.data.entries();
		}
	}, {
		key: "filter",
		value: function filter(fn) {
			var result = [];

			this.forEach(function (value, key) {
				if (fn((0, _utility.clone)(value), (0, _utility.clone)(key)) === true) {
					result.push((0, _deps.tuple)(key, value));
				}
			});

			return _deps.tuple.apply(_deps.tuple, result);
		}
	}, {
		key: "forEach",
		value: function forEach(fn, ctx) {
			return this.data.forEach(fn, ctx);
		}
	}, {
		key: "get",
		value: function get(key) {
			var output = undefined;

			if (this.data.has(key)) {
				output = (0, _deps.tuple)(key, this.data.get(key));
			}

			return output;
		}
	}, {
		key: "keys",
		value: function keys() {
			return this.data.keys();
		}
	}, {
		key: "limit",
		value: function limit() {
			var start = arguments[0] === undefined ? 0 : arguments[0];
			var offset = arguments[1] === undefined ? 0 : arguments[1];

			var i = start,
			    nth = start + offset,
			    list = [],
			    k = undefined;

			if (i < 0 || i >= nth) {
				throw new Error("Invalid range");
			}

			do {
				k = this.registry[i];

				if (k) {
					list.push(this.get(k));
				}
			} while (++i < nth);

			return _deps.tuple.apply(_deps.tuple, list);
		}
	}, {
		key: "map",
		value: function map(fn) {
			var result = [];

			this.forEach(function (value, key) {
				result.push((0, _deps.tuple)(key, fn((0, _utility.clone)(value), (0, _utility.clone)(key))));
			});

			return _deps.tuple.apply(_deps.tuple, result);
		}
	}, {
		key: "request",
		value: function request(input) {
			var config = arguments[1] === undefined ? {} : arguments[1];

			var cfg = (0, _utility.merge)(this.config, config);

			return (0, _deps.fetch)(input, cfg).then(function (res) {
				return res[res.headers.get("content-type").indexOf("application/json") > -1 ? "json" : "text"]().then(function (arg) {
					if (res.status === 0 || res.status >= 400) {
						throw (0, _deps.tuple)(arg, res.status);
					}

					return (0, _deps.tuple)(arg, res.status);
				}, function (e) {
					throw (0, _deps.tuple)(e.message, res.status);
				});
			}, function (e) {
				throw (0, _deps.tuple)(e.message, 0);
			});
		}
	}, {
		key: "set",
		value: function set(key, data) {
			var _this3 = this;

			var batch = arguments[2] === undefined ? false : arguments[2];
			var override = arguments[3] === undefined ? false : arguments[3];

			var defer = (0, _utility.deferred)(),
			    method = "post",
			    ldata = (0, _utility.clone)(data),
			    next = undefined;

			next = function () {
				if (method === "post") {
					++_this3.total;
					_this3.registry.push(key);
					_this3.versions.set(key, new _deps.Set());
				} else {
					_this3.versions.get(key).add((0, _deps.tuple)(_this3.data.get(key)));
				}

				_this3.data.set(key, ldata);
				defer.resolve(_this3.get(key));
			};

			if (key === undefined || key === null) {
				key = this.key ? ldata[this.key] : (0, _utility.uuid)() || (0, _utility.uuid)();
			} else if (this.data.has(key)) {
				method = "put";

				if (!override) {
					ldata = (0, _utility.merge)(this.get(key)[1], ldata);
				}
			}

			if (!batch && this.uri) {
				this.request(this.uri.replace(/\?.*/, "") + "/" + key, { method: method, body: JSON.stringify(ldata) }).then(next, function (e) {
					defer.reject(e[0] || e);
				});
			} else {
				next();
			}

			return defer.promise;
		}
	}, {
		key: "setUri",
		value: function setUri(uri) {
			var _this4 = this;

			var defer = (0, _utility.deferred)();

			this.uri = uri;

			if (this.uri) {
				this.request(this.uri).then(function (arg) {
					var data = arg[0];

					if (_this4.source) {
						try {
							_this4.source.split(".").forEach(function (i) {
								data = data[i];
							});
						} catch (e) {
							return defer.reject(e);
						}
					}

					_this4.batch(data, "set").then(function (records) {
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
		key: "values",
		value: function values() {
			return this.data.values();
		}
	}]);

	return Haro;
})();

exports.Haro = Haro;
//# sourceMappingURL=haro.js.map