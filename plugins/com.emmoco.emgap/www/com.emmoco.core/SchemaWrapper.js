if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require) {
	
	'use strict"';
	
	/* -------- IMPORTS -------- */	
	var ResourceSchema = require('com.emmoco.core/ResourceSchema');
	var ResourceValue = require('com.emmoco.core/ResourceValue');
	var Utils = require('com.emmoco.core/Utils');
	
	var ID_FMT_MASK = 0x3;
	var SHORT_HASH_LENGTH = 6;
	
	var sSchemaTab = {};
	var sSystemSchema;
	
	function addSchema(jobj) {
		var schema = ResourceSchema.create(jobj);
		var hashKey = mkHashKey(schema.hash);
		var sw = find(hashKey);
		if (!sw) {
			sw = init.call(new SchemaWrapper(), schema, hashKey);
		}
		return sw;
	}
	
	function find(hashKey) {
		return sSchemaTab[hashKey];
	}
	
	function getResources() {
		return this.mResTab;
	}
	
	function init(schema, hashKey) {
		this.mSchema = schema;
		this.mHashKey = hashKey;
		this.mResTab = [];
		var self = this;
		schema.getResourceNames().forEach(function (rn) {
			var val = self.mkResourceValue(rn);
			self.mResTab.push(val);
			self.mResTab[rn] = val;
		});
		if (!sSystemSchema && schema && schema.name == "System") {
			sSystemSchema = schema;
		}
		if (!(hashKey in sSchemaTab)) {
			sSchemaTab[hashKey] = this;
		}
		return this;
	}
	
	function mkHashKey(bytes, aflag) {
		var res = "";
		var sep = "";
		for (var i = 0; i < SHORT_HASH_LENGTH; i++) {
			var b = bytes[i];
			if (i == 0 && !aflag) {
				b &= ~ID_FMT_MASK;
			}
			res += sep + Utils.sprintf((aflag ? "%02X" : "%d"), b);
			sep = aflag ? ":" : ".";
		}
		return res;
	};
	
	function mkBroadcastValue() {
		var resName = this.mSchema.getBroadcaster();
		return resName ? this.mkResourceValue(resName) : null;
	}
	
	function mkResourceValue(resId, initVal, mode) {
		/// TODO: initVal, mode
		var resName = Utils.isNumber(resId) ? this.mSchema.getResourceName(resId) : resId;
		return ResourceValue.create(resName, this.mSchema.getResourceType(resName), this.mSchema);
	}
	
	/* -------- EXPORTS -------- */
	function SchemaWrapper() {}
	SchemaWrapper.ID_FMT_MASK = ID_FMT_MASK;
	SchemaWrapper.SHORT_HASH_LENGTH = SHORT_HASH_LENGTH;
	SchemaWrapper.addSchema = addSchema;
	SchemaWrapper.find = find;
	SchemaWrapper.mkHashKey = mkHashKey;
	SchemaWrapper.prototype = Object.defineProperties({}, {
		hashKey:	{ get: function() { return this.mHashKey; }},
		name: 		{ get: function() { return this.mSchema.name; }},
		schemaId:	{ get: function() { return Utils.sprintf("%s-%s", this.name, this.hashKey); }},
	});
	SchemaWrapper.prototype.getResources = getResources;
	SchemaWrapper.prototype.mkBroadcastValue = mkBroadcastValue;
	SchemaWrapper.prototype.mkResourceValue = mkResourceValue;
	return SchemaWrapper;
});