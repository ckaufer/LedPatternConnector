if (typeof define !== 'function') { var define = require('amdefine')(module); }

define (function (require) {

	"use strict";

	var App;
	var $NAVBAR;
	var $POPUP;
	
	
    var scene = {"sceneId":0,"led":["OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF"]}
	
	
	
	function changePage(reverse) {
		$.mobile.changePage($('#device-list'), {reverse: reverse, transition: 'slide'});
	}
	
	
	function display(devList) {
		var html = "";
		if(!devList[0]) {
			console.log("N");
			html += sprintf("<p class='message'>%s</p>", "Looking for nearby devices..");
		} else {
			devList.forEach(function (desc) {
				html += sprintf("<li class='devlist-item' data-devid='%s'>", desc.deviceId);
				html += sprintf("<p class='item deviceName'>%s</p>", desc.deviceName);
				if (desc.schemaName) {
					html += sprintf("<p class='item schemaId'>%s - %s</p>", desc.schemaName, desc.schemaHash);
				}
				else {
					html += sprintf("<p class='item schemaId-null'>&lt;Unknown&gt; - %s</p>", desc.schemaHash);
				}
				html += sprintf("<p class='item rssi'>RSSI: %s</p>", desc.rssi);
				html += "</li>";
			
			});
		}
	
		
		
		var $ul = $('#device-list-content ul');
		$ul.html(html);
		$ul.listview('refresh');
		$('.devlist-item').click(function (eobj) {
			App.doOpen(devList[eobj.currentTarget.dataset['devid']]);
		});
		
		
		
		$NAVBAR.find('.ui-btn-active').removeClass('ui-btn-active');
	}
	
	function init(appMod) {
		App = appMod;
		$NAVBAR = $('#device-list-footer-navbar');
		$POPUP = $('#device-list-login-popup');
		$NAVBAR.find('#remove').click(function () {
			App.doRemoveSchemas();
		});
		$POPUP.on('popupafteropen', function(event, ui) {
			$POPUP.find('input[name="apikey"]').val(App.apiKey());
		});		
		$POPUP.on('popupafterclose', function(event, ui) {
			App.apiKey(($POPUP.find('input[name="apikey"]').val()));
		});		
		$.mobile.changePage($('#device-list'));
	}
	
	/* -------- EXPORTS -------- */
	var DeviceListView = {};
	DeviceListView.changePage = changePage;
	DeviceListView.display = display;
	DeviceListView.init = init;
	return DeviceListView;
});

