var path = require( "path" ),
    haro = require( path.join( __dirname, "../lib/server/index" ) ),
    data = require( path.join( __dirname, "data.json" ) );

exports["empty"] = {
	setUp: function (done) {
		this.store = haro();
		done();
	},
	test: function (test) {
		test.expect(2);
		test.equal(this.store.total, 0, "Should be '0'");
		test.equal(this.store.data.size, 0, "Should be '0'");
		test.done();
	}
};

exports["create"] = {
	setUp: function (done) {
		this.store = haro();
		done();
	},
	test: function (test) {
		var self = this;

		test.expect(4);
		test.equal(this.store.total, 0, "Should be '0'");
		test.equal(this.store.data.size, 0, "Should be '0'");
		this.store.set(null, data[0]).then(function(arg) {
			test.equal(self.store.total, 1, "Should be '1'");
			test.equal(self.store.data.size, 1, "Should be '1'");
			test.done();
		}, function (e) {
			console.log(e.stack);
			test.done();
		});
	}
};

exports["create (batch)"] = {
	setUp: function (done) {
		this.store = haro();
		done();
	},
	test: function (test) {
		var self = this;

		test.expect(11);
		test.equal(this.store.total, 0, "Should be '0'");
		test.equal(this.store.data.size, 0, "Should be '0'");
		this.store.batch(data, "set").then(function() {
			test.equal(self.store.total, 6, "Should be '6'");
			test.equal(self.store.data.size, 6, "Should be '6'");
			test.equal(self.store.registry.length, 6, "Should be '6'");
			test.equal(self.store.limit(2, 1)[0][0], self.store.get(self.store.registry[2])[0], "Should be a match");
			test.equal(self.store.limit(2, 2)[1][0], self.store.get(self.store.registry[3])[0], "Should be a match");
			test.equal(self.store.limit(10, 5).length, 0, "Should be '0'");
			test.equal(self.store.filter(function (i) { return /decker/i.test(i.name); }).length, 1, "Should be '1'");
			test.equal(self.store.map(function (i) { i.name = 'John Doe'; return i; }).length, 6, "Should be '6'");
			test.equal(self.store.map(function (i) { i.name = 'John Doe'; return i; })[0][1].name, 'John Doe', "Should be a match");
			test.done();
		}, function (e) {
			console.log(e.stack);
			test.done();
		});
	}
};

exports["read (valid)"] = {
	setUp: function (done) {
		this.store = haro();
		done();
	},
	test: function (test) {
		var self = this;

		test.expect(4);
		this.store.set(null, data[0]).then(function(arg) {
			var record = self.store.get(arg[0]);

			test.equal(self.store.total, 1, "Should be '1'");
			test.equal(self.store.data.size, 1, "Should be '1'");
			test.equal(Object.keys(record[1]).length, 19, "Should be a '19'");
			test.equal(record[1].name, "Decker Merrill", "Should be a match");
			test.done();
		}, function (e) {
			console.log(e.stack);
			test.done();
		});
	}
};

exports["read (invalid)"] = {
	setUp: function (done) {
		this.store = haro();
		done();
	},
	test: function (test) {
		var self = this;

		test.expect(3);
		this.store.set(null, data[0]).then(function() {
			test.equal(self.store.total, 1, "Should be '1'");
			test.equal(self.store.data.size, 1, "Should be '1'");
			test.equal(self.store.get('abc'), undefined, "Should be 'undefined'");
			test.done();
		}, function (e) {
			console.log(e.stack);
			test.done();
		});
	}
};

exports["update"] = {
	setUp: function (done) {
		this.store = haro();
		done();
	},
	test: function (test) {
		var self = this;

		test.expect(3);
		this.store.set(null, data[0]).then(function(arg) {
			test.equal(arg[1].name, "Decker Merrill", "Should be a match");
			return arg;
		}).then(function (arg) {
			self.store.set(arg[0], {name: "John Doe"}).then(function (arg) {
				test.equal(arg[1].name, "John Doe", "Should be a match");
				test.equal(self.store.versions.get(arg[0]).size, 1, "Should be a '1'");
				test.done();
			}, function (e) {
				console.log(e.stack);
				test.done();
			});
		}).catch(function (e) {
			console.log(e.stack);
			test.done();
		});
	}
};

exports["delete"] = {
	setUp: function (done) {
		this.store = haro();
		done();
	},
	test: function (test) {
		var self = this;

		test.expect(3);
		this.store.set(null, data[0]).then(function(arg) {
			test.equal(arg[1].name, "Decker Merrill", "Should be a match");
			return arg;
		}).then(function (arg) {
			self.store.del(arg[0]).then(function () {
				test.equal(self.store.total, 0, "Should be '0'");
				test.equal(self.store.data.size, 0, "Should be '0'");
				test.done();
			}, function (e) {
				console.log(e.stack);
				test.done();
			});
		}).catch(function (e) {
			console.log(e.stack);
			test.done();
		});
	}
};

exports["delete (batch)"] = {
	setUp: function (done) {
		this.store = haro();
		done();
	},
	test: function (test) {
		var self = this;

		test.expect(3);
		this.store.batch(data, "set").then(function(arg) {
			test.equal(arg[0][1].name, "Decker Merrill", "Should be a match");
			return arg;
		}).then(function (arg) {
			self.store.batch([arg[0][0], arg[2][0]], "del").then(function () {
				test.equal(self.store.total, 4, "Should be '4'");
				test.equal(self.store.data.size, 4, "Should be '4'");
				test.done();
			}, function (e) {
				console.log(e.stack);
				test.done();
			});
		}).catch(function (e) {
			console.log(e.stack);
			test.done();
		});
	}
};
