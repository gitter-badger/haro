"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

require("core-js");

var _haro = require("./haro");

function factory() {
	var data = arguments[0] === undefined ? null : arguments[0];
	var config = arguments[1] === undefined ? {} : arguments[1];

	return new _haro.Haro(data, config);
}

exports["default"] = factory;
module.exports = exports["default"];
//# sourceMappingURL=index.js.map