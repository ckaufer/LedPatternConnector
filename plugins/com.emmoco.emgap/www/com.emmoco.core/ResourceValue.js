if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require) {

	'use strict';
	
	/* -------- IMPORTS -------- */
	var SerialPacket = require('com.emmoco.core/SerialPacket');
	var ResourceSchema = require('com.emmoco.core/ResourceSchema');
	var Utils = require('com.emmoco.core/Utils');
	
	function ResourceValue() {}
	
	/* -------- ArrayVal -------- */
	
	function ArrayVal(rv) { 
		this.base = rv;
		this.mVal = [];
		var params = this.base.mSchema.getArrayParams(this.base.mType);
		for (var i = 0; i < params.len; i++) {
			this.mVal.push(create(Utils.sprintf("%d", i), params.elemType, this.base.mSchema));
		}
	}

	ArrayVal.prototype.addData = function (pkt) {
		this.mVal.forEach(function (e) {
			e.addData(pkt);
		});
	};
	
	ArrayVal.prototype.addPacked = function (pack) {
		var rep = 0;
		var doShift = false;
		for (var idx = this.mVal.length - 1; idx >= 0; idx--) {
			var elemVal = this.mVal[idx];
			var mask = (1 << pack) - 1;
			var val = 0;
			if (elemVal.isEnum || elemVal.isNum) {
				val = elemVal.mSub.getOrd();
			}
			else if (elemVal.isStruct) {
				val = elemVal.mSub.addPacked();
			}
			if (doShift) {
				rep <<= pack;
			}
			rep |= mask & val;
			doShift = true;
		}
		return rep;
	};

	ArrayVal.prototype.assignVal = function (val) {
		for (var i = 0; i < this.mVal.length; i++) {
			if (val[i] !== undefined) {
				this.mVal[i].value = val[i];
			}
		}
	};

	ArrayVal.prototype.children = function () {
		return this.mVal;
	};
	
	ArrayVal.prototype.getLength = function () {
		return this.mVal.length;
	};

	ArrayVal.prototype.getVal = function () {
		var res = [];
		this.mVal.forEach(function (e) {
			res.push(e.value);
		});
		return res;
	};
	
	ArrayVal.prototype.scanData = function (pkt, size) {
		this.mVal.forEach(function (e) {
			e.scanData(pkt, size);
		});
	};

	ArrayVal.prototype.scanPacked = function (rep, pack) {
		var mask = (1 << pack) - 1;
		for (var idx = 0; idx < this.mVal.length; idx++) {
			var elemVal = this.mVal[idx];
			var val = rep & mask;
			rep >>= pack;
			if (elemVal.isEnum || elemVal.isNum) {
				elemVal.mSub.assignOrd(val);
			}
			else if (elemVal.isStruct) {
				elemVal.mSub.scanPacked(val);
			}
		}
	};

	/* -------- EnumVal -------- */
	
	function EnumVal(rv) {
		this.base = rv;
		this.mEnumVals = this.base.mSchema.getEnumValues(this.base.mType);
		this.mVal = this.mEnumVals[0];
	}

	EnumVal.prototype.addData = function (pkt) {
		pkt.addInt8(this.mEnumVals[this.mVal]);
	};
	
	EnumVal.prototype.assignOrd = function (ord) {
		this.mVal = this.mEnumVals[ord];
	};
	
	EnumVal.prototype.assignVal = function (val) {
		this.mVal = val;
	};
	
	EnumVal.prototype.getEnumVals = function () {
		return this.mEnumVals;
	};
	
	EnumVal.prototype.getOrd = function () {
		return this.mEnumVals[this.mVal];
	};
		
	
	EnumVal.prototype.getVal = function () {
		return this.mVal;
	};
	
	EnumVal.prototype.scanData = function (pkt, size) {
		this.mVal = this.mEnumVals[pkt.scanUns8()];
	};
	
	/* -------- FileVal -------- */
	
	function FileVal(rv) {
		this.base = rv;
		this.mVal = [];
		this.mOff = 0;
		this.mEof = false;
	}
	
	FileVal.prototype.addData = function (pkt) {
		var cnt = this.mVal.length - this.mOff;
		if (cnt > SerialPacket.DATA_SIZE) {
			cnt = SerialPacket.DATA_SIZE;
		}
		else {
			this.mEof = true;
		}
		for (var i = 0; i < cnt; i++) {
			pkt.addInt8(this.mVal[this.mOff++]);
		}
	};
	
	FileVal.prototype.assignVal = function (val) {
		this.mVal = val;
	};
	
	FileVal.prototype.fileEof = function () {
		return this.mEof;
	};
	
	FileVal.prototype.fileFetch = function () {
		this.mOff = 0;
		this.mEof = false;
	};
	
	FileVal.prototype.fileStore = function () {
		this.mVal = [];
	};
	
	FileVal.prototype.getVal = function () {
		return this.mVal;
	};
	
	FileVal.prototype.scanData = function (pkt, size) {
		for (var i = 0; i < size; i++) {
			this.mVal.push(pkt.scanUns8());
		}
	};
	
	/* -------- IntVal -------- */
	
	function IntVal(rv) {
		this.base = rv;
		this.mVal = 0;
		this.mMax = IntVal.MAXTAB[this.base.mType];
		this.mMin = IntVal.MINTAB[this.base.mType];
		this.mIsUns = this.base.mType[0] == 'u';
		this.mSize = this.base.mSchema.getStdTypeSize(this.base.mType);
		this.mAlign = this.base.mSchema.getStdTypeAlign(this.base.mType);
	}

	IntVal.MAXTAB = {
			i1:	0x7f,
			i2: 0x7fff,
			i4: 0x7fffffff,
			u1: 0xff,
			u2: 0xffff,
			u4: 0xffffffff,
	};
	
	IntVal.MINTAB = {
			i1:	-(0x80),
			i2: -(0x8000),
			i4: -(0x80000000),
			u1: 0x0,
			u2: 0x0,
			u4: 0x0,
	};
	
	IntVal.prototype.addData = function (pkt) {
		pkt.alignTo(this.mAlign);
		switch (this.mSize) {
		case 1:
			pkt.addInt8(this.mVal);
			break;
		case 2:
			pkt.addInt16(this.mVal);
			break;
		case 4:
			pkt.addInt32(this.mVal);
			break;
		}
	};
	
	IntVal.prototype.assignVal = function (val) {
		val = Number(val);
		if (Number.isNaN(val)) return;
		this.mVal = val < this.mMin ? this.mMin : val > this.mMax ? this.mMax : val;
	};
	
	IntVal.prototype.getMax = function () {
		return this.mMax;
	};
	
	IntVal.prototype.getMin = function () {
		return this.mMin;
	};
	
	IntVal.prototype.getStep = function () {
		return 1;
	};
	
	IntVal.prototype.getVal = function () {
		return this.mVal;
	};
	
	IntVal.prototype.scanData = function (pkt, size) {
		pkt.alignTo(this.mAlign);
		switch (this.mSize) {
		case 1:
			this.mVal = this.mIsUns ? pkt.scanUns8() : pkt.scanInt8();
			break;
		case 2:
			this.mVal = this.mIsUns ? pkt.scanUns16() : pkt.scanInt16();
			break;
		case 4:
			this.mVal = this.mIsUns ? pkt.scanUns32() : pkt.scanInt32();
			break;
		}
	};
	
	/* -------- NumVal -------- */
	
	function NumVal(rv) {
		this.base = rv;
		var params = this.base.mSchema.getNumParams(this.base.mType);
		this.mMin = params[0];
		this.mMax = params[1];
		this.mStep = params[2];
		this.mScale = Math.pow(10, params[3]);
		this.mScaledMin = Math.round(this.mMin * this.mScale);
		this.mScaledStep = Math.round(this.mStep * this.mScale);
		this.mNumValues = Math.round((this.mMax - this.mMin) / this.mStep);
		this.assignVal(this.mMin);
		var rep = this.base.mSchema.getNumRep(this.base.mType);
		this.mIsUns = rep[0] == 'u';
		this.mSize = this.base.mSchema.getStdTypeSize(rep);
		this.mAlign = this.base.mSchema.getStdTypeAlign(rep);
	}
	
	NumVal.prototype.addData = function (pkt) {
		pkt.alignTo(this.mAlign);
		switch (this.mSize) {
		case 1:
			pkt.addInt8(this.mVal);
			break;
		case 2:
			pkt.addInt16(this.mVal);
			break;
		case 4:
			pkt.addInt32(this.mVal);
			break;
		}
	};
	
	NumVal.prototype.assignOrd = function (ord) {
		this.mOrd = (ord < 0) ? 0 : (ord > this.mNumValues) ? this.mNumValues : ord;
		this.mVal = Math.round(this.mScaledMin + (this.mOrd * this.mScaledStep));
	};

	NumVal.prototype.assignVal = function (val) {
		val = Number(val);
		if (Number.isNaN(val)) return;
		val = (val < this.mMin) ? this.mMin : (val > this.mMax) ? this.mMax : val;
		this.mOrd = Math.round((val - this.mMin) / this.mStep);
		this.mVal = Math.round(this.mScaledMin + (this.mOrd * this.mScaledStep));
	};

	NumVal.prototype.getOrd = function () {
		return this.mOrd;
	};
	
	NumVal.prototype.getMax = function () {
		return this.mMax;
	};
	
	NumVal.prototype.getMin = function () {
		return this.mMin;
	};
	
	NumVal.prototype.getStep = function () {
		return this.mStep;
	};
	
	NumVal.prototype.getVal = function () {
		return this.mVal / this.mScale;
	};
	
	NumVal.prototype.scanData = function (pkt, size) {
		pkt.alignTo(this.mAlign);
		var intVal = Number.NaN;
		switch (this.mSize) {
		case 1:
			intVal = this.mIsUns ? pkt.scanUns8() : pkt.scanInt8();
			break;
		case 2:
			intVal = this.mIsUns ? pkt.scanUns16() : pkt.scanInt16();
			break;
		case 4:
			 intVal = this.mIsUns ? pkt.scanUns32() : pkt.scanInt32();
			break;
		}
		this.assignVal(intVal / this.mScale);
	};
	
	/* -------- StringVal -------- */

	function StringVal(rv) {
		this.base = rv;
		this.mLen = this.base.mSchema.getStringLen(this.base.mType);
		this.mVal = "";
	}

	StringVal.prototype.addData = function (pkt) {
		for (var i = 0; i < this.mVal.length; i++) {
			pkt.addInt8(this.mVal.charCodeAt(i));
		}
		for (var i = this.mVal.length; i < this.mLen + 1; i++) {
			pkt.addInt8(0);
		}
	};
	
	StringVal.prototype.assignVal = function (val) {
		this.mVal = String(val).substring(0, this.mLen);
	};
	
	StringVal.prototype.getLength = function () {
		return this.mLen;
	};
	
	StringVal.prototype.getVal = function () {
		return this.mVal;
	};
	
	StringVal.prototype.scanData = function (pkt, size) {
		this.mVal = "";
		for (var i = 0; i < this.mLen + 1; i++) {
			var b = pkt.scanUns8();
			if (b) {
				this.mVal += String.fromCharCode(b);
			}
		}
	};

	/* -------- StructVal -------- */

	function StructVal(rv) {
		this.base = rv;
		this.mVal = {};
		var type = this.base.mType;
		var schema = this.base.mSchema;
		this.mPackedSize = schema.getStructPack(type) > 0 ? schema.getStructSize(type) : 0;
		this.mFieldInfo = schema.getFieldInfo(type);
		for (var i = 0; i < this.mFieldInfo.length; i++) {
			var fld = this.mFieldInfo[i];
			this.mVal[fld.name] = create(Utils.sprintf("%s", fld.name), fld.type, schema);
		}
	}

	StructVal.prototype.addData = function (pkt) {
		if (this.mPackedSize == 0) {
			for (var i = 0; i < this.mFieldInfo.length; i++) {
				var fld = this.mFieldInfo[i];
				this.mVal[fld.name].addData(pkt);
			}
		}
		else {
			var rep = this.addPacked();
			switch (this.mPackedSize) {
			case 1:
				pkt.addInt8(rep);
				break;
			case 2:
				pkt.addInt16(rep);
				break;
			case 4:
				pkt.addInt32(rep);
				break;
			}
		}
	};
	
	StructVal.prototype.addPacked = function () {
		var rep = 0;
		var doShift = false;
		for (var idx = this.mFieldInfo.length - 1; idx >= 0; idx--) {
			var fldInfo = this.mFieldInfo[idx];
			var fldVal = this.mVal[fldInfo.name];
			var pack = fldInfo.pack;
			var mask = (1 << pack) - 1;
			var val = 0;
			if (fldVal.isEnum || fldVal.isNum) {
				val = fldVal.mSub.getOrd();
			}
			else if (fldVal.isStruct) {
				val = fldVal.mSub.addPacked();
			}
			else if (fldVal.isArray) {
				val = fldVal.mSub.addPacked(pack / fldVal.length);
			}
			if (doShift) {
				rep <<= pack;
			}
			rep |= mask & val;
			doShift = true;
		}
		return rep;
	};

	StructVal.prototype.assignVal = function (val) {
		for (var i = 0; i < this.mFieldInfo.length; i++) {
			var fld = this.mFieldInfo[i];
			if (val[fld.name] !== undefined) {
				this.mVal[fld.name].value = val[fld.name];
			}
		}
	};

	StructVal.prototype.children = function () {
		var res = [];
		for (var i = 0; i < this.mFieldInfo.length; i++) {
			var fld = this.mFieldInfo[i];
			res.push(this.mVal[fld.name]);
		}
		return res;
	};
	
	StructVal.prototype.getVal = function () {
		var res = {};
		for (var i = 0; i < this.mFieldInfo.length; i++) {
			var fld = this.mFieldInfo[i];
			res[fld.name] = this.mVal[fld.name].value;
		}
		return res;
	};

	StructVal.prototype.scanData = function (pkt, size) {
		if (this.mPackedSize == 0) {
			for (var i = 0; i < this.mFieldInfo.length; i++) {
				var fld = this.mFieldInfo[i];
				this.mVal[fld.name].scanData(pkt, size);
			};
		}
		else {
			var rep =
				this.mPackedSize == 1 ? pkt.scanUns8() :
				this.mPackedSize == 2 ? pkt.scanUns16() :
				pkt.scanUns32();
			this.scanPacked(rep);
		}
	};

	StructVal.prototype.scanPacked = function (rep) {
		for (var idx = 0; idx < this.mFieldInfo.length; idx++) {
			var fldInfo = this.mFieldInfo[idx];
			var fldVal = this.mVal[fldInfo.name];
			var pack = fldInfo.pack;
			var mask = (1 << pack) - 1;
			var val = rep & mask;
			rep >>= pack;
			if (fldVal.isEnum || fldVal.isNum) {
				fldVal.mSub.assignOrd(val);
			}
			else if (fldVal.isStruct) {
				fldVal.mSub.scanPacked(val);
			}
			else if (fldVal.isArray) {
				fldVal.mSub.scanPacked(val, pack / fldVal.length);
			}
		}
	};

	/* -------- VoidVal -------- */

	function VoidVal(rv) {
		this.base = rv;
	}
	
	function addData(pkt) {
		this.mSub.addData(pkt);
	}
	
	function create(name, type, schema) {
		return init.call(new ResourceValue(), name, type, schema);
	}

	function fileFetch() {
		this.mSub.fileFetch();
	}
	
	function fileStore() {
		this.mSub.fileStore();
	}
	
	function init(name, type, schema) {
		this.mName = name;
		this.mType = type;
		this.mSchema = schema;
		var ch = type[0];
		if (ch.search(/[a-z]/) == 0) {
			this.mSub = (ch == 'v') ? new VoidVal(this) : new IntVal(this);
		}
		else {
			this.mSub = 
				ch == 'N' ? new NumVal(this) :
				ch == 'E' ? new EnumVal(this) :
				ch == 'S' ? new StructVal(this) :
				ch == 'A' ? new ArrayVal(this) :
				ch == 'C' ? new StringVal(this) :
				ch == 'B' ? new FileVal(this) :
				null;
		}
		return this;
	}

	function scanData(pkt, size) {
		this.mSub.scanData(pkt, size);
	}
	
	function testAccess(acc) {
		return this.mSchema.getResourceAccess(this.mName).indexOf(acc) != -1;
	}
	
	/* -------- EXPORTS -------- */
	ResourceValue.create = create;
	ResourceValue.prototype = Object.defineProperties({}, {
		access: { 
			get: function() { return this.mSchema.getResourceAccess(this.mName); }},
	    children: {
			get: function() { return 'children' in this.mSub ? this.mSub.children() : null; }},
	    enumVals: {
				get: function() { return 'getEnumVals' in this.mSub ? this.mSub.getEnumVals() : undefined; }},
	    fileEof: {
			get: function() { return this.mSub.fileEof(); }},
		isArray: { 
			get: function() { return this.mSub instanceof ArrayVal; }},
		isEnum: { 
			get: function() { return this.mSub instanceof EnumVal; }},
		isFile: { 
			get: function() { return this.mSub instanceof FileVal; }},
		isIndicator: { 
			get: function() { return testAccess.call(this, 'i'); }},
		isInt: { 
			get: function() { return this.mSub instanceof IntVal; }},
		isNum: { 
			get: function() { return this.mSub instanceof NumVal; }},
		isReadable: { 
			get: function() { return testAccess.call(this, 'r'); }},
		isScalar: {
			get: function() { return !this.isArray && !this.isStruct; }},
		isString: { 
			get: function() { return this.mSub instanceof StringVal; }},
		isStruct: { 
			get: function() { return this.mSub instanceof StructVal; }},
		isVoid: { 
			get: function() { return this.mSub instanceof VoidVal; }},
		isWriteable: { 
			get: function() { return testAccess.call(this, 'w'); }},
		length: { 
			get: function() { return this.mSub.getLength(); }},
	    max: {
			get: function() { return 'getMax' in this.mSub ? this.mSub.getMax() : undefined; }},
	    min: {
			get: function() { return 'getMin' in this.mSub ? this.mSub.getMin() : undefined; }},
		name: { 
			get: function() { return this.mName; }},
		resourceId: {
			get: function(v) { return this.mSchema.getResourceId(this.mName); }},
	    step: {
			get: function() { return 'getStep' in this.mSub ? this.mSub.getStep() : undefined; }},
		typeName: {
			get: function(v) { return this.mSchema.mkTypeName(this.mType); }},
		value: {
			get: function(v) { return this.mSub.getVal(); },
			set: function(v) { this.mSub.assignVal(v); return v; }},
	});
	ResourceValue.prototype.addData = addData;
	ResourceValue.prototype.fileFetch = fileFetch;
	ResourceValue.prototype.fileStore = fileStore;
	ResourceValue.prototype.scanData = scanData;
	
	return ResourceValue;
});