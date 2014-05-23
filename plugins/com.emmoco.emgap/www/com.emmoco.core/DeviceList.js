if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports) {

	'use strict';

	/* -------- IMPORTS -------- */
	
	var SchemaWrapper = require('com.emmoco.core/SchemaWrapper');
	var SerialPacket = require('com.emmoco.core/SerialPacket');
	var Utils = require('com.emmoco.core/Utils');
	
	var FmtKind = Utils.EnumT(
	    'ADDR',
	    'TEXT',
	    'SERIAL'
	);

	var FMT_LEN = [6, 6, 4];
	
	var INFO_LEN = 24;
	
	var O_RSSI = 0;
	var O_ADDR = 1;
	var O_DLEN = 7;
	var O_HASH = 8;
	var O_ID = O_HASH + SchemaWrapper.SHORT_HASH_LENGTH;
	
	var BASE16CHARS = "0123456789ABCDEF";
	var BASE40CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ-.0123456789?";
	var RADIX = 40;
	
	var sCurDevTab = null;
	
	/* -------- PUBLICS -------- */

	function Device() {}
	
	Device.prototype.toString = function() {
		return Utils.sprintf("<Device %s>", this.addr);
	};

	function add(data) {
		for (var i = 0; i < data.length; i += INFO_LEN) {
			addDev(data.subarray(i, i + INFO_LEN));
		}
	}
	
	function beginCycle(devTab) {
		sCurDevTab = {};
	}
	
	function endCycle() {
		var devTab = sCurDevTab;
		sCurDevTab = null;
		return devTab;
	}
	
	/* -------- PRIVATES -------- */

	function addDev(info) {
		var hash = SchemaWrapper.mkHashKey(info.subarray(O_HASH, O_HASH + SchemaWrapper.SHORT_HASH_LENGTH));
		var sw = SchemaWrapper.find(hash);
		var fmt = info[O_HASH] & SchemaWrapper.ID_FMT_MASK;
		var xoff = O_ID + FMT_LEN[fmt];
		var dev = new Device();
		dev.rssi = info[O_RSSI] - 256;
		dev.broadcast = null;
		dev.addr = info.subarray(O_ADDR, O_DLEN);
		dev.hash = hash;
		dev.name = mkName(fmt, info.subarray(O_ID, xoff)).trim();
		dev.sw = sw;
		dev.extra = info.subarray(xoff, O_HASH + info[O_DLEN]);
		dev.id = Utils.sprintf("%s!%s", dev.sw ? dev.sw.schemaId : dev.hash, dev.name);
		sCurDevTab[dev.id] = dev;
	}
	
	function mkName(idFmt, idBuf) {
		var res = "";
		var idx;
		switch (idFmt) {
		case FmtKind.TEXT:
			idx = 0;
			for (var i = 0; i < 3; i++) {
				var word = idBuf[idx++] | (idBuf[idx++] << 8);
				var cz = word % RADIX;
				word = (word - cz) / RADIX;
				var cy = word % RADIX;
				word = (word - cy) / RADIX;
				var cx = word % RADIX;
				res += BASE40CHARS[cx] + BASE40CHARS[cy] + BASE40CHARS[cz]; 
			}
			break;
		case FmtKind.SERIAL:
			idx = 2;
			res = "EDB";
			for (var i = 0; i < 3; i++) {
				res += Utils.sprintf("-%02X", idBuf[idx--]);
			}
			break;
		case FmtKind.ADDR:
			res = "@:";
			var sep = "";
			for (var i = 0; i < 6; i++) {
				res += Utils.sprintf("%s%02X", sep, idBuf[i]);
				sep = ":";
			}
			break;
		}
		return res;
	}
	
	/* -------- EXPORTS -------- */

	exports.add = add;
	exports.beginCycle = beginCycle;
	exports.endCycle = endCycle;
});