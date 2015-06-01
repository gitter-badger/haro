"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

require("core-js");

var _deps = require("./deps");

var _haro = require("./haro");

var _utility = require("./utility");

if (typeof fetch === "undefined") {
	var _fetch = _deps.import_fetch;
}

if (typeof Map === "undefined") {
	var _Map = _deps.import_Map;
}

if (typeof Promise === "undefined") {
	var _Promise = _deps.import_Promise;
}

if (typeof Set === "undefined") {
	var _Set = _deps.import_Set;
}

if (typeof tuple === "undefined") {
	var _tuple = _deps.import_tuple;
}

function factory() {
	var data = arguments[0] === undefined ? null : arguments[0];
	var config = arguments[1] === undefined ? {} : arguments[1];

	return new _haro.Haro(data, config);
}

exports["default"] = factory;
module.exports = exports["default"];
//# sourceMappingURL=index.js.map