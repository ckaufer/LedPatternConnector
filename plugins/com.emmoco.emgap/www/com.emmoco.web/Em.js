define(function (require, exports) {
	
	'use strict';
	
	var ConnectionMgr = require('com.emmoco.core/ConnectionMgr');
	var SchemaWrapper = require('com.emmoco.core/SchemaWrapper');
	var SerialPacket = require('com.emmoco.core/SerialPacket');
	var Utils = require('com.emmoco.core/Utils');
	
	var sprintf = Utils.sprintf;

	function getResources(schemaHash) {
		return SchemaWrapper.find(schemaHash).getResources();
 	}
	
	function loadSchemas(schemaArr) {
		schemaArr.forEach(function (sch) {
            require([sprintf("schemas/%s.js", sch.toLowerCase())], function (jobj) {
    			ConnectionMgr.addSchema(jobj);
            });
		});
	}
	
	function setTrace() {
		
	}
	
	function start(fxn) {
		Mailbox.init(SerialPacket)
		ConnectionMgr._start(Mailbox, function () {
			fxn && fxn();
		});
	}
	
	exports.ConnectionMgr = ConnectionMgr;
	exports.getResources = getResources;
	exports.loadSchemas = loadSchemas;
	exports.setTrace = setTrace;
	exports.start = start;

});
