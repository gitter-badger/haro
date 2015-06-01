import "core-js";
import { Haro } from "./haro";

function factory ( data=null, config={} ) {
	return new Haro( data, config );
}

export default factory;
