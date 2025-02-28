class Haro {
	constructor (data, config = {}) {
		this.adapters = {};
		this.data = new Map();
		this.delimiter = "|";
		this.config = {
			method: "get",
			credentials: false,
			headers: {
				accept: "application/json",
				"content-type": "application/json"
			}
		};
		this.id = uuid();
		this.index = [];
		this.indexes = new Map();
		this.key = "";
		this.logging = true;
		this.patch = false;
		this.registry = [];
		this.source = "";
		this.total = 0;
		this.uri = "";
		this.versions = new Map();
		this.versioning = true;

		Object.keys(config).forEach(i => {
			this[i] = merge(this[i], config[i]);
		});

		this.reindex();

		if (data) {
			this.batch(data, "set");
		}
	}

	batch (args, type) {
		let defer = deferred(),
			del = type === "del",
			data, fn, hash;

		function next () {
			Promise.all(args.map(fn)).then(function (arg) {
				defer.resolve(arg);
			}, function (e) {
				defer.reject(e);
			});
		}

		if (del) {
			fn = i => {
				return this.del(i, true);
			};
		} else {
			fn = i => {
				return this.set(null, i, true, true);
			};
		}

		if (this.patch) {
			if (del) {
				data = patch(this.toArray().map(i => {
					return i[this.key];
				}), args, this.key, true);
			} else {
				data = [];
				hash = {};
				args.forEach(i => {
					let key = i[this.key];

					if (key) {
						hash[key] = i;
					} else {
						data.push({op: "add", path: "/", value: i});
					}
				});
				data = data.concat(patch(this.toObject(), hash, this.key, true));
			}

			if (data.length > 0) {
				this.request(concatURI(this.uri, null), {
					method: "patch",
					body: JSON.stringify(data)
				}).then(function () {
					next();
				}, function (e) {
					defer.reject(e);
				});
			} else {
				defer.resolve();
			}
		} else {
			next();
		}

		return defer.promise;
	}

	clear () {
		this.total = 0;
		this.registry = [];
		this.data.clear();
		this.indexes.clear();
		this.versions.clear();

		if (this.logging) {
			console.log("Cleared " + this.id);
		}

		return this.reindex();
	}

	cmd (type, ...args) {
		let defer = deferred();

		if (!this.adapters[type] || !adapter[type]) {
			defer.reject(new Error(type + " not configured for persistent storage"));
		} else {
			adapter[type].apply(this, [this].concat(args)).then(function (arg) {
				defer.resolve(arg);
			}, function (e) {
				defer.reject(e);
			});
		}

		return defer.promise;
	}

	del (key, batch = false) {
		let defer = deferred(),
			next;

		next = () => {
			let index = this.registry.indexOf(key);

			if (index > -1) {
				if (index === 0) {
					this.registry.shift();
				} else if (index === (this.registry.length - 1)) {
					this.registry.pop();
				} else {
					this.registry.splice(index, 1);
				}

				delIndex(this.index, this.indexes, this.delimiter, key, this.data.get(key));
				this.data.delete(key);
				--this.total;

				if (this.versioning) {
					this.versions.delete(key);
				}

				this.storage("remove", key).then(success => {
					if (success && this.logging) {
						console.log("Deleted", key, "from persistent storage");
					}
				}, e => {
					if (this.logging) {
						console.error("Error deleting", key, "from persistent storage:", (e.message || e.stack || e));
					}
				});
			}

			defer.resolve();
		};

		if (this.data.has(key)) {
			if (!batch && this.uri) {
				if (this.patch) {
					this.request(concatURI(this.uri, null), {
						method: "patch",
						body: JSON.stringify([{op: "remove", path: "/" + key}])
					}).then(next, e => {
						if (e[1] === 405) {
							this.patch = false;
							this.request(concatURI(this.uri, key), {
								method: "delete"
							}).then(next, function (err) {
								defer.reject(err);
							});
						} else {
							defer.reject(e);
						}
					});
				} else {
					this.request(concatURI(this.uri, key), {
						method: "delete"
					}).then(next, function (e) {
						defer.reject(e);
					});
				}
			} else {
				next();
			}
		} else {
			defer.reject(new Error("Record not found"));
		}

		return defer.promise;
	}

	entries () {
		return this.data.entries();
	}

	find (where) {
		let key = Object.keys(where).sort().join(this.delimiter),
			value = keyIndex(key, where, this.delimiter),
			result = [];

		if (this.indexes.has(key)) {
			(this.indexes.get(key).get(value) || new Set()).forEach(i => {
				result.push(this.get(i));
			});
		}

		return tuple.apply(tuple, result);
	}

	filter (fn) {
		let result = [];

		this.forEach(function (value, key) {
			if (fn(value, key) === true) {
				result.push(tuple(key, value));
			}
		});

		return tuple.apply(tuple, result);
	}

	forEach (fn, ctx) {
		this.data.forEach(function (value, key) {
			fn(clone(value), clone(key));
		}, ctx);

		return this;
	}

	get (key) {
		let output;

		if (this.data.has(key)) {
			output = tuple(key, this.data.get(key));
		}

		return output;
	}

	has (key) {
		return this.data.has(key);
	}

	keys () {
		return this.data.keys();
	}

	limit (offset = 0, max) {
		let loffset = offset,
			lmax = max,
			list = [],
			i, k, nth;

		if (lmax === undefined) {
			lmax = loffset;
			loffset = 0;
		}

		i = loffset;
		nth = loffset + lmax;

		if (i < 0 || i >= nth) {
			throw new Error("Invalid range");
		}

		do {
			k = this.registry[i];

			if (k) {
				list.push(this.get(k));
			}
		} while (++i < nth);

		return tuple.apply(tuple, list);
	}

	load (type = "mongo") {
		this.clear();

		return this.cmd(type, "get").then(arg => {
			if (this.logging) {
				console.log("Loaded " + this.id + " from " + type + " persistent storage");
			}

			return this.batch(arg, "set");
		}, e => {
			if (this.logging) {
				console.error("Error loading " + this.id + " from " + type + " persistent storage: " + (e.message || e.stack || e));
			}

			throw e;
		});
	}

	map (fn) {
		let result = [];

		this.forEach(function (value, key) {
			result.push(fn(value, key));
		});

		return tuple.apply(tuple, result);
	}

	storage (...args) {
		let defer = deferred(),
			deferreds = [];

		Object.keys(this.adapters).forEach(i => {
			deferreds.push(this.cmd.apply(this, [i].concat(args)));
		});

		if (deferreds.length > 0) {
			Promise.all(deferreds).then(function () {
				defer.resolve(true);
			}, function (e) {
				defer.reject(e);
			});
		} else {
			defer.resolve(false);
		}

		return defer.promise;
	}

	register (key, fn) {
		adapter[key] = fn;
	}

	reindex (index) {
		if (!index) {
			this.indexes.clear();
			this.index.forEach(i => {
				this.indexes.set(i, new Map());
			});
			this.forEach((data, key) => {
				this.index.forEach(i => {
					setIndex(this.index, this.indexes, this.delimiter, key, data, i);
				});
			});
		} else {
			this.indexes.set(index, new Map());
			this.forEach((data, key) => {
				setIndex(this.index, this.indexes, this.delimiter, key, data, index);
			});
		}

		return this;
	}

	request (input, config = {}) {
		let defer = deferred(),
			cfg = merge(this.config, config);

		cfg.method = cfg.method.toUpperCase();

		fetch(input, cfg).then(function (res) {
			let status = res.status,
				headers;

			if (res.headers._headers) {
				headers = {};
				Object.keys(res.headers._headers).forEach(function (i) {
					headers[i] = res.headers._headers[i].join(", ");
				});
			} else {
				headers = toObjekt(res.headers);
			}

			res[res.headers.get("content-type").indexOf("application/json") > -1 ? "json" : "text"]().then(function (arg) {
				defer[status < 200 || status >= 400 ? "reject" : "resolve"](tuple(arg, status, headers));
			}, function (e) {
				defer.reject(tuple(e.message, status, headers));
			});
		}, function (e) {
			defer.reject(tuple(e.message, 0, {}));
		});

		return defer.promise;
	}

	save (type = "mongo") {
		return this.cmd(type, "set").then(arg => {
			if (this.logging) {
				console.log("Saved " + this.id + " to " + type + " persistent storage");
			}

			return arg;
		}, e => {
			if (this.logging) {
				console.error("Error saving " + this.id + " to " + type + " persistent storage: " + (e.message || e.stack || e));
			}

			throw e;
		});
	}

	search (value, index) {
		let indexes = index ? (this.index.indexOf(index) > -1 ? [index] : []) : this.index,
			result = [],
			fn = typeof value === "function",
			rgex = value instanceof RegExp,
			seen = new Set();

		if (value) {
			indexes.forEach(i => {
				let idx = this.indexes.get(i);

				if (idx) {
					idx.forEach((lset, lkey) => {
						if ((fn && value(lkey)) || (rgex && value.test(lkey)) || (lkey === value)) {
							lset.forEach(key => {
								if (!seen.has(key)) {
									seen.add(key);
									result.push(this.get(key));
								}
							});
						}
					});
				}
			});
		}

		return tuple.apply(tuple, result);
	}

	set (key, data, batch = false, override = false) {
		let defer = deferred(),
			method = "post",
			ldata = clone(data),
			lkey = key,
			body, ogdata;

		let next = (arg) => {
			let xdata = arg ? arg[0] : {};

			if (lkey === null) {
				if (this.key) {
					if (this.source) {
						this.source.split(".").forEach(function (i) {
							xdata = xdata[i] || {};
						});
					}

					lkey = xdata[this.key] || ldata[this.key] || uuid();
				} else {
					lkey = uuid();
				}
			}

			if (method === "post") {
				this.registry[this.total] = lkey;
				++this.total;

				if (this.versioning) {
					this.versions.set(lkey, new Set());
				}
			} else {
				if (this.versioning) {
					this.versions.get(lkey).add(tuple(ogdata));
				}

				delIndex(this.index, this.indexes, this.delimiter, lkey, ogdata);
			}

			this.data.set(lkey, ldata);
			setIndex(this.index, this.indexes, this.delimiter, lkey, ldata);
			defer.resolve(this.get(lkey));

			this.storage("set", lkey, ldata).then(success => {
				if (success && this.logging) {
					console.log("Saved", lkey, "to persistent storage");
				}
			}, e => {
				if (this.logging) {
					console.error("Error saving", lkey, "to persistent storage:", (e.message || e.stack || e));
				}
			});
		};

		if (lkey === undefined || lkey === null) {
			lkey = null;
		} else if (this.data.has(lkey)) {
			method = "put";
			ogdata = this.data.get(lkey);

			if (!override) {
				ldata = merge(ogdata, ldata);
			}
		}

		if (!batch && this.uri) {
			if (this.patch) {
				if (method === "post") {
					body = [{op: "add", path: "/", value: ldata}];
				} else if (override) {
					body = [{op: "replace", path: "/", value: ldata}];
				} else {
					body = patch(ogdata, ldata, this.key);
				}

				this.request(concatURI(this.uri, lkey), {
					method: "patch",
					body: JSON.stringify(body)
				}).then(next, e => {
					if (e[1] === 405) {
						this.patch = false;
						this.request(concatURI(this.uri, lkey), {
							method: method,
							body: JSON.stringify(ldata)
						}).then(next, function (err) {
							defer.reject(err);
						});
					} else {
						defer.reject(e);
					}
				});
			} else {
				this.request(concatURI(this.uri, lkey), {
					method: method,
					body: JSON.stringify(ldata)
				}).then(next, function (e) {
					defer.reject(e);
				});
			}
		} else {
			next();
		}

		return defer.promise;
	}

	setUri (uri, clear = false) {
		let defer = deferred();

		this.uri = uri;

		if (this.uri) {
			this.sync(clear).then(function (arg) {
				defer.resolve(arg);
			}, function (e) {
				defer.reject(e);
			});
		} else {
			defer.resolve([]);
		}

		return defer.promise;
	}

	sort (fn) {
		return this.toArray().sort(fn);
	}

	sortBy (index) {
		let result = [],
			keys = [],
			lindex;

		if (!this.indexes.has(index)) {
			this.index.push(index);
			this.reindex(index);
		}

		lindex = this.indexes.get(index);
		lindex.forEach((idx, key) => {
			keys.push(key);
		});

		keys.sort().forEach(i => {
			lindex.get(i).forEach(key => {
				result.push(this.get(key));
			});
		});

		return tuple.apply(tuple, result);
	}

	sync (clear = false) {
		let defer = deferred();

		this.request(this.uri).then(arg => {
			let data = arg[0];

			this.patch = (arg[2].Allow || arg[2].allow || "").indexOf("PATCH") > -1;

			if (this.source) {
				try {
					this.source.split(".").forEach(function (i) {
						data = data[i];
					});
				} catch (e) {
					return defer.reject(e);
				}
			}

			if (clear) {
				this.clear();
			}

			this.batch(data, "set").then(function (records) {
				defer.resolve(records);
			}, function (e) {
				defer.reject(e);
			});
		}, function (e) {
			defer.reject(e[0] || e);
		});

		return defer.promise;
	}

	toArray () {
		let result = [];

		this.forEach(function (value) {
			result.push(value);
		});

		return result;
	}

	toObject () {
		return toObjekt(this);
	}

	unload (type = "mongo") {
		return this.cmd(type, "remove").then(arg => {
			if (this.logging) {
				console.log("Unloaded " + this.id + " from " + type + " persistent storage");
			}

			return arg;
		}, e => {
			if (this.logging) {
				console.error("Error unloading " + this.id + " from " + type + " persistent storage: " + (e.message || e.stack || e));
			}

			throw e;
		});
	}

	unregister (key) {
		delete adapter[key];
	}

	values () {
		return this.data.values();
	}
}
