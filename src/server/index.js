import "core-js";
import { import_fetch, import_Map, import_Promise, import_Set, import_tuple } from "./deps";
import { Haro } from "./haro";
import { clone, deferred, merge, uuid } from "./utility";

if (typeof fetch === "undefined") {
	const fetch = import_fetch;
}

if (typeof Map === "undefined") {
	const Map = import_Map;
}

if (typeof Promise === "undefined") {
	const Promise = import_Promise;
}

if (typeof Set === "undefined") {
	const Set = import_Set;
}

if (typeof tuple === "undefined") {
	const tuple = import_tuple;
}

function factory ( data=null, config={} ) {
	return new Haro( data, config );
}

export default factory;
