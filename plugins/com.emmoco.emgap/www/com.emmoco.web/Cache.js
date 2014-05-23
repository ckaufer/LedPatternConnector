if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports) {

	'use strict';
	
	var sFileSys
	
	function fail(error) {
	    console.log(error);
	}
	
	function init(cb) {
		if (sFileSys) cb();
		navigator.webkitPersistentStorage.requestQuota(1024*1024, function (numBytes) {
			window.webkitRequestFileSystem(PERSISTENT, numBytes, function (fs) {
				sFileSys = fs;
				cb();
			}, fail);
		}, fail);
	}
	
	function loadAllSchemas(doneFxn, removeFlag) {
		doneFxn();
/*		
		init (function () {
			doneFxn();
		});
*/		
	}

	function saveSchema(sid, json) {
/*		
	    fileSystem.root.getFile(sid, {create: true, exclusive: false}, function (fileEntry) {
	    	fileEntry.createWriter(function (writer) {
	    	    writer.write(new Blob([JSON.stringify(json)]));
	    	}, fail);
	    }, fail);
*/	    
	}
	
	/* -------- EXPORTS -------- */

	exports.loadAllSchemas = loadAllSchemas;
	exports.saveSchema = saveSchema;
});