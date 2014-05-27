if (typeof define !== 'function') { var define = require('amdefine')(module); }

define (function (require) {

	'use strict';

	/* -------- IMPORTS -------- */
	var Cache = require('com.emmoco.web/Cache');
	var Em = require('com.emmoco.web/Em');
	var DeviceListView = require('./view/DeviceListView');
	var ResourceListView = require('./view/ResourceListView');
	var ResourceValueView = require('./view/ResourceValueView');
	var Utils = require('com.emmoco.core/Utils');

	var localStorage = window.localStorage;
	var sprintf = Utils.sprintf;
	var val;
	var sApiKey = '';
	var sDev = null;
	var sRemoving = false;
	var sResTab = null;
	var sResVal = null;
	var sScanning = false;
	var sStarting = true;
	var sTimeout = null;
	var connecting = false;
	
	function apiKey(key) {
		if (key != undefined) sApiKey = localStorage.apiKey = key;
		return sApiKey;
	}
	
	function doEditBegin(resid, rVal) {
		sResVal = resid;
		val = rVal;
		//ResourceValueView.changePage();
		//ResourceValueView.display(sResVal);
		doWrite(false);
	}
	
	function doEditEnd() {
		ResourceListView.changePage(true);
	}
	
	function doClose() {
		Em.ConnectionMgr.closeDevice();
	}
	
	function doOpen(desc) {
		if (!desc.schemaName) return;
		if (sScanning) {
			sDev = desc;
			return;
		}
		if (sTimeout) {
			clearTimeout(sTimeout);
			sTimeout = null;
		}
		console.log("opening %s...", desc.deviceName);
		Em.ConnectionMgr.openDevice(desc, function(err) {
			console.log("done");
			sResTab = Em.getResources(desc.schemaHash);
			ResourceListView.setConnected(true);
			ResourceListView.changePage();
			ResourceListView.display(desc.schemaName, sResTab);
			
			Em.ConnectionMgr.onIndicator(onIndicator);
		});
	}
	
	function doRead(rVal) {
		Em.ConnectionMgr.readResource(rVal, function (err, val) {
			/*ResourceValueView.storeLeaves(valToLeaves(sResVal, val));
			ResourceValueView.refresh(false);*/
			console.log(val);
			
		});
	}
	
	function doRemoveSchemas() {
		sRemoving = true;
		Cache.loadAllSchemas(function () {
			sRemoving = false;
			doScan();
		}, true);
	}
	
	function doScan() {
		if (sRemoving) return;
 		console.log('scanning...');
 		sScanning = true;
		Em.ConnectionMgr.scanDevices(500, function (err, devList) {
			if (sDev) {
				console.log('open ready');
				sScanning = false;
				doOpen(sDev);
				return;
			}
			console.log(devList[0]);
			DeviceListView.display(devList);
			devList.forEach(function (desc) {
				!desc.schemaId && fetchSchema(desc.schemaHash);
			});
			sTimeout = setTimeout(function (){ doScan(); }, 1000);
		});
	}
	
	function doWrite(readFlag) {
		console.log(sResVal);
		console.log(val);
		//var val = leavesToVal(sResVal, ResourceValueView.fetchLeaves());
		Em.ConnectionMgr.writeResource(sResVal, val, function(e) {
			if (readFlag) {
				doRead();
			}
			else {
				ResourceValueView.refresh(true);
			}
		});
	}
	
	function fail(err) {
		console.log("Error: %s", err);
	}
	
	function fetchSchema(hash) {
		var url = sprintf('http://api.em-hub.com/all_schemas/schema_hash/%s?format=js&auth_token=%s', hash, sApiKey);
		console.log('fetching %s from em-hub...', hash);
		$.ajax({
	        type: 'GET',
	        url: url,
	        async: false,
	        cache: false,
	        headers: { 
	        	Accept : "application/javascript"
	        },
	        contentType: "application/javascript",
	        jsonpCallback: 'jsonCallback',
	        dataType: 'jsonp',
	        success: function(json) {
	        	var sid = Em.ConnectionMgr.addSchema(json);
	        	Cache.saveSchema(sid, json);
	        },
	        error: function(e) {
	        	console.log("Error: " + e);
	        }
	    });
		
	}
	
	function init() {
		sApiKey = localStorage.apiKey;
		Cache.loadAllSchemas(function () {
			Em.ConnectionMgr.onDisconnect(onDisconnect);
			ResourceListView.init(App, DeviceListView);
			DeviceListView.init(App);
			ResourceValueView.init(App);
			
			Em.start(function () {
				console.log('starting...');
			});
		});
		
		ResourceListView.changePage();
		ResourceListView.display("Led Pattern Designer", "Yo");
		console.log();
	}

	function leavesToVal(rval, leaves) {
		var carr = rval.children;
		if (carr == null) {
			return leaves.shift();
		}
		var vobj;
		if (rval.isArray) {
			vobj = [];
			for (var i = 0; i < carr.length; i++) {
				vobj.push(leavesToVal(carr[i], leaves));
			}
		}
		else {
			vobj = {};
			for (var i = 0; i < carr.length; i++) {
				vobj[carr[i].name] = leavesToVal(carr[i], leaves);
			}
		}
		return vobj;
	}
	
	function onDisconnect() {
		sDev = null;
		sResVal = null;
		Em.ConnectionMgr.onIndicator(null);
		console.log(sStarting ? 'ready' : 'onDisconnect');
		sStarting = false;
		ResourceListView.setConnected(false);
		ResourceListView.changePage(true);
		ResourceListView.display();
		//doScan();
	}
	
	function onIndicator(name, value) {
		ResourceListView.onIndicator(name, value);
	}
	
	function valToLeaves(rval, vobj) {
		var carr = rval.children;
		if (carr == null) {
			return [vobj];
		}
		var leaves = [];
		if (rval.isArray) {
			for (var i = 0; i < carr.length; i++) {
				leaves = leaves.concat(valToLeaves(carr[i], vobj[i]));
			};
		}
		else {
			for (var i = 0; i < carr.length; i++) {
				leaves = leaves.concat(valToLeaves(carr[i], vobj[carr[i].name]));
			};
		}
		return leaves;
	}
	
	/* -------- EXPORTS -------- */
	var App = {};
	App.apiKey = apiKey;
	App.doClose = doClose;
	App.doEditBegin = doEditBegin;
	App.doEditEnd = doEditEnd;
	App.doOpen = doOpen;
	App.doRead = doRead;
	App.doRemoveSchemas = doRemoveSchemas;
	App.doScan = doScan;
	App.doWrite = doWrite;
	App.init = init;
	App.Em = Em;
	App.sendSequence = ResourceListView.sendSequence;
	return App;
});
