if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require) {
	
	'use strict';
	
	var TYPETAB = {
		i1:	'int8',
		i2: 'int16',
		i4: 'int32',
		u1: 'uint8',
		u2: 'uint16',
		u4: 'uint32',
		v:  'void',
	};

	function create(jobj) {
		return init.call(new ResourceSchema(), jobj);
	}

	function getArrayParams(type) {
		var k = type.indexOf(':');
		return {len: Number(type.substring(1, k)), elemType: type.substring(k + 1)};
	}
	
	function getBroadcaster() {
		return 'broadcaster' in this.mJobj.manifest ? this.mJobj.manifest.broadcaster : null;
	}
	
	function getEnumValues(type) {
		var map = [];
		var valArr = this.mJobj.types[type.substring(2)].values;
		for (var i = 0; i < valArr.length; i++) {
			map.push(valArr[i]);
			map[valArr[i]] = i;
		}
		return map;
	}
	
	function getFieldInfo(type) {
		var map = [];
		var fldArr = this.mJobj.types[type.substring(2)].fields;
		fldArr.forEach(function (fld) {
			map.push(fld);
			map[fld.name] = fld;
		});
		return map;
	}
	
	function getNumParams(type) {
		var params = type.substring(2, type.indexOf('/')).split(',');
		var res = [];
		params.forEach(function (p) {
			res.push(Number(p));
		});
		return res;
	}
	
	function getNumRep(type) {
		return type.split('/')[1];
	}
	
	function getResourceAccess(res) {
		return this.mJobj.resources[res].access;
	}
	
	function getResourceId(res) {
		return this.mJobj.resources[res].id;
	}
	
	function getResourceType(res) {
		return this.mJobj.resources[res].type;
	}
	
	function getResourceName(id) {
		if (id > 0) {
			return this.mJobj.resourceNames[id - 1];
		}
		var cnt = this.mJobj.resourceNamesApp.length;
		return this.mJobj.resourceNames[-id - 1 + cnt];
	}
	
	function getResourceNames() {
		return this.mJobj.resourceNames;
	}
	
	function getStdTypeAlign(type) {
		return this.mJobj.types["std:" + type].align;
	}
	
	function getStdTypeSize(type) {
		return this.mJobj.types["std:" + type].size;
	}
	
	function getStringLen(type) {
		return Number(type.substring(2)) - 1;
	}
	
	function getStructPack(type) {
		var strObj = this.mJobj.types[type.substring(2)];
		return ('pack' in strObj) ? strObj.pack : 0;
	}
	
	function getStructSize(type) {
		return this.mJobj.types[type.substring(2)].size;
	}
	
	function hasResource(res) {
		return Boolean(this.mJobj.resources[res]);
	}
	
	function init(jobj) {
		this.mJobj = jobj;
		return this;
	}
	
	function mkTypeName(type) {
		var ch = type[0];
		if (ch.search(/[a-z]/) == 0) {
			return sprintf("<em-bi>%s</em-bi>", TYPETAB[type]);
		}
		switch (ch) {
		case 'A':
			var p = getArrayParams.call(this, type);
			return sprintf("%s %%[%d]", mkTypeName.call(this, p.elemType), p.len);
		case 'C': 
			return sprintf("<em-bi>string</em-bi> <%d>", getStringLen.call(this, type));
		case 'E':
			var s = type.substring(2);
			return sprintf("<em-kw>enum</em-kw> %s", s.substring(s.indexOf('/') + 1));
		case 'N':
			return "<em-bi>num</em-bi>";
//			var p = getNumParams.call(this, type);
//			var s = "<em-bi>num</em-bi>  <%.#f, %.#f, %.#f>".replace(/#/g, p[3]);
//			return sprintf(s, p[0], p[1], p[2]);
		case 'S':
			var s = type.substring(2);
			return sprintf("<em-kw>struct</em-kw> %s", s.substring(s.indexOf('/') + 1));
		}
	}
	
	/* -------- EXPORTS -------- */
	function ResourceSchema() {}
	ResourceSchema.create = create;
	ResourceSchema.prototype = Object.defineProperties({}, {
		hash: { get: function() { return this.mJobj.manifest.hash.slice(0, 6); }},
		name: { get: function() { return this.mJobj.manifest.name; }},
	});
	ResourceSchema.prototype.getArrayParams = getArrayParams;
	ResourceSchema.prototype.getBroadcaster = getBroadcaster;
	ResourceSchema.prototype.getEnumValues = getEnumValues;
	ResourceSchema.prototype.getFieldInfo = getFieldInfo;
	ResourceSchema.prototype.getNumParams = getNumParams;
	ResourceSchema.prototype.getNumRep = getNumRep;
	ResourceSchema.prototype.getResourceAccess = getResourceAccess;
	ResourceSchema.prototype.getResourceId = getResourceId;
	ResourceSchema.prototype.getResourceName = getResourceName;
	ResourceSchema.prototype.getResourceNames = getResourceNames;
	ResourceSchema.prototype.getResourceType = getResourceType;
	ResourceSchema.prototype.getStdTypeAlign = getStdTypeAlign;
	ResourceSchema.prototype.getStdTypeSize = getStdTypeSize;
	ResourceSchema.prototype.getStringLen = getStringLen;
	ResourceSchema.prototype.getStructPack = getStructPack;
	ResourceSchema.prototype.getStructSize = getStructSize;
	ResourceSchema.prototype.hasResource = hasResource;
	ResourceSchema.prototype.mkTypeName = mkTypeName;
	return ResourceSchema;
});