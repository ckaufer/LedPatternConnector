if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function() {

	'use strict';
	
	var sprintfFxn = (typeof sprintf === 'function') ? sprintf : require('sprintf').sprintf;
	
	var t0 = new Date().getTime();
	
	function Utils() {}
	
	function EnumT(vals) {
		var E = [];
		for (var i = 0; i < arguments.length; i++) {
			E.push(arguments[i]);
			E[arguments[i]] = i;
		}
		return E;
	}
	
	function hex2bytes(hs) {
		var res = new Array;
		for (var i = 0; i < hs.length; i += 2) {
			res.push(parseInt(hs.substr(i, 2), 16));
		}
		return res;
	};

	function info(fmt) {
		var argv = new Array;
		for (var i = 1; i < arguments.length; i++) {
			argv.push(arguments[i]);
		}
		var s = vsprintf(fmt, argv).replace(/ /g, "&nbsp;");
		var dt = (new Date().getTime() - t0) / 1000;
	    $("#log").append(sprintf("%07.3fs :: %s</br>", dt, s));
	};
	
	function isNumber(n) {
		return typeof(n) === 'number' || n instanceof Number;
	}
	
	function isString(s) {
		return typeof(s) === 'string' || s instanceof String;
	}
	
	Utils.EnumT = EnumT;
	Utils.hex2bytes = hex2bytes;
	Utils.info = info;
	Utils.isNumber = isNumber;
	Utils.isString = isString;
	Utils.sprintf = sprintfFxn;
	return Utils;
});	
