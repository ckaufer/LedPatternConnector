if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require) {

	'use strict';
	
	/* -------- IMPORTS -------- */
	var Utils = require('com.emmoco.core/Utils');

	var DATA_SIZE = 240;
	var HDR_SIZE = 4;
	
	var PktKind = Utils.EnumT(
		'NOP',
		'FETCH',
		'FETCH_DONE',
		'STORE',
		'STORE_DONE',
		'INDICATOR',
		'CONNECT',
		'DISCONNECT',
		'ECHO',
		'PAIRING',
		'PAIRING_DONE',
		'OFFLINE',
		'ACCEPT',
		'START',
		'ACTIVE_PARAMS',
		'SCAN',
		'SCAN_DONE',
		'BEACON'
	);
	
	function PktHdr() {
	}

	PktHdr.prototype.toString = function() {
		return Utils.sprintf("<size: %d, kind: %s, resid: %d>", this.size, PktKind[this.kind], this.resId);
	};

	function create(buf) {
		return init.call(new SerialPacket(), buf);
	}

	function addHdr(kind, resId, chan) {
		this.mHdr = false;
		addInt8.call(this, HDR_SIZE);
		addInt8.call(this, kind);
		addInt8.call(this, resId ? resId : 0);
		addInt8.call(this, chan ? chan : 0);
		this.mHdr = true;
	}
	
	function addInt8(d) {
		this.mBuffer[this.mCurIdx++] = (d & 0xFF) - (d < 0 ? 256 : 0);
		incSize.call(this, 1);
	}
	
	function addInt16(d) {
		this.mBuffer[this.mCurIdx++] = d & 0xFF;
		this.mBuffer[this.mCurIdx++] = ((d >> 8) & 0xFF) - (d < 0 ? 256 : 0);
		incSize.call(this, 2);
	}
	
	function addInt32(d) {
		this.mBuffer[this.mCurIdx++] = d & 0xFF;
		this.mBuffer[this.mCurIdx++] = (d >> 8) & 0xFF;
		this.mBuffer[this.mCurIdx++] = (d >> 16) & 0xFF;
		this.mBuffer[this.mCurIdx++] = ((d >> 24) & 0xFF) - (d < 0 ? 256 : 0);
		incSize.call(this, 4);
	}
	
	function alignTo(align) {
		var off = this.mCurIdx % align;
		if (off) {
			var inc = align -off;
			this.mCurIdx += inc;
			incSize.call(this, inc);
		}
	}
	
	function incSize(sz) {
		if (this.mHdr) {
			this.mBuffer[0] += sz;
		}
	}
	
	function init(buf) {
		if (buf) {
			this.mBuffer = buf;
			this.mCurIdx = buf.length;
		}
		else {
			this.mBuffer = new Uint8Array(HDR_SIZE + DATA_SIZE);
			this.mCurIdx = 0;
		}
		this.mHdr = false;
		return this;
	}
	
	function getData() {
		return this.mBuffer.subarray(HDR_SIZE, this.mBuffer[0]);
	}
	
	function getHdr() {
		var idx = this.mCurIdx;
		this.mCurIdx = 0;
		var hdr = scanHdr.call(this);
		this.mCurIdx = idx;
		return hdr;
	}
	
	function rewind() {
		this.mCurIdx = 0;
	}
	
	function scanHdr() {
		var hdr = new PktHdr();
		hdr.size = scanUns8.call(this);
		hdr.kind = scanUns8.call(this);
		hdr.resId = scanInt8.call(this);
		hdr.chan = scanUns8.call(this);
		return hdr;
	}
	
	function scanInt8() {
		var b0 = this.mBuffer[this.mCurIdx++];
		b0 = b0 < 128 ? b0 : (b0 - 256);
		return b0;
	}
	
	function scanInt16() {
		var b0 = this.mBuffer[this.mCurIdx++];
		var b1 = this.mBuffer[this.mCurIdx++];
		b1 = b1 < 128 ? b1 : (b1 - 256);
		return b0 + (b1 << 8);
	}
	
	function scanInt32() {
		var b0 = this.mBuffer[this.mCurIdx++];
		var b1 = this.mBuffer[this.mCurIdx++];
		var b2 = this.mBuffer[this.mCurIdx++];
		var b3 = this.mBuffer[this.mCurIdx++];
		b3 = b3 < 128 ? b3 : (b3 - 256);
		return b0 + (b1 << 8) + (b2 << 16) + (b3 << 24);
	}
	
	function scanUns8() {
		var b0 = this.mBuffer[this.mCurIdx++];
		return b0 < 0 ? (b0 + 256) : b0;
	}
	
	function scanUns16() {
		var b0 = this.mBuffer[this.mCurIdx++];
		var b1 = this.mBuffer[this.mCurIdx++];
		return b0 + (b1 << 8);
	}
	
	function scanUns32() {
		var b0 = this.mBuffer[this.mCurIdx++];
		var b1 = this.mBuffer[this.mCurIdx++];
		var b2 = this.mBuffer[this.mCurIdx++];
		var b3 = this.mBuffer[this.mCurIdx++];
		var b4 = 0;
		if (b3 > 127) {
			b3 = b3 - 128;
			b4 = 0x80000000;
		}
		return b0 + (b1 << 8) + (b2 << 16) + (b3 << 24) + b4;
	}
	
	/* -------- EXPORTS -------- */
	function SerialPacket() {}
	SerialPacket.prototype = Object.defineProperties({}, {
		buffer: { get: function() { return this.mBuffer; }},
		length:	{ get: function() { return this.mCurIdx; }},
	});
	SerialPacket.DATA_SIZE = DATA_SIZE;
	SerialPacket.HDR_SIZE = HDR_SIZE;
	SerialPacket.PktKind = PktKind;
	SerialPacket.create = create;
	SerialPacket.prototype.addHdr = addHdr;
	SerialPacket.prototype.addInt8 = addInt8;
	SerialPacket.prototype.addInt16 = addInt16;
	SerialPacket.prototype.addInt32 = addInt32;
	SerialPacket.prototype.alignTo = alignTo;
	SerialPacket.prototype.getData = getData;
	SerialPacket.prototype.getHdr = getHdr;
	SerialPacket.prototype.rewind = rewind;
	SerialPacket.prototype.scanHdr = scanHdr;
	SerialPacket.prototype.scanInt8 = scanInt8;
	SerialPacket.prototype.scanInt16 = scanInt16;
	SerialPacket.prototype.scanInt32 = scanInt32;
	SerialPacket.prototype.scanUns8 = scanUns8;
	SerialPacket.prototype.scanUns16 = scanUns16;
	SerialPacket.prototype.scanUns32 = scanUns32;
	return SerialPacket;
});