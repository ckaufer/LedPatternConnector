if (typeof define !== 'function') { var define = require('amdefine')(module); }

define (function (require) {

	"use strict";

	var INDFMT = "%3d";
	
	var App;

	var scene = {"sceneId":0,"led":["OFF","OFF","ON","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF"]}
	var colors = ["blue","blue","blue","blue","blue","blue","white","white","white","white","white","white","blue"];
	var x = [200,70,70,200,329,329,243.8,156.3,112.5,156.3,243.8,287.5,200];
	var y = [50,125,275,350,275,125,124,124,200,275.8,275.8,200,200];
	var mainBoardWidth = 350;
	var ledRadius = 30;
	
	function updateCurrentSceneVal(ledNum) {
		if(scene.led[ledNum] == "ON") {
		    scene.led[ledNum] = "OFF";
		}
		else {
		    scene.led[ledNum] = "ON";
		}
	}
	function updateStates(ledNum) {
	    if(scene.led[ledNum] == "ON") {
			ledOff(ledNum);
		}
		else {
			ledOn(ledNum);
		}
	}
	
	function updateLedStates() {
		for(var i = 0; i <= 15; i++) {
			updateStates(i);
			console.log("Updating Led " + i);
		}
	}
	function ledOn(ledNum) {
		$('#mainBoard').find('div[data-ledNum="'+ ledNum + '"]').attr('data-color', colors[ledNum]);
	}
	
	function ledOff(ledNum) {
		$('#mainBoard').find('div[data-ledNum="'+ ledNum + '"]').attr('data-color', "off");
	}
	function changePage(reverse) {
		$.mobile.changePage($('#resource-list'), {reverse: reverse, transition: 'slide'});
		updateLedStates();
	}
	
	function display(schName, resTab) {
		$('#resource-list h1').text(schName);
		var noAppDiv = true;
		var noSysDiv = true;
		var html = "";
		html += sprintf("<div id='mainBoard' style='width: %dpx; height: %dpx' >", mainBoardWidth, mainBoardWidth);
		for(var i = 0; i <= 13; i++) {
			html += sprintf("<div class='mainBoardLed .reslist-item' data-color='%s'  data-resid='currentScene' data-ledNum='%s' style='left: %spx; top: %spx; width: %spx; height: %spx' ></div>", colors[i], i + 2, x[i], y[i], 30, 30);
		}
		html += sprintf("</div>");
		/*resTab.forEach(function (res) {
			if (noAppDiv) {
				html += sprintf("<li class='reslist-divider' data-role='list-divider'>Application Resources</li>");
				noAppDiv = false;
			}
			if (noSysDiv && res.name[0] == '$') {
				html += sprintf("<li class='reslist-divider' data-role='list-divider'>System Resources</li>");
				noSysDiv = false;
			}
			html += sprintf("<li class='reslist-item' data-resid='%s'>", res.name);
			html += sprintf("<a class='name'>%s</a>", res.name, res.name);
			html += sprintf("<div class='access'>");
			html += sprintf("<img src='images/read-icon-%sactive.png'/>", res.isReadable ? "" : "in");
			html += sprintf("<img src='images/write-icon-%sactive.png'/>", res.isWriteable ? "" : "in");
			if (res.isIndicator) {
				html += sprintf("<pre class='ind-count'>%s</pre>", sprintf(INDFMT, 0));
			}
			html += sprintf("</div>");
			html += "</li>";
		});*/
		
		var $ul = $('#resource-list-content ul');
		$ul.html(html);
		$ul.listview('refresh');
		$('.reslist-item').click(function (eobj) {
			App.doEditBegin(eobj.currentTarget.dataset['resid']);
		});
		
		$('.mainBoardLed').click(function (eobj) {
			console.log($(this).attr('data-color'));
			updateStates($(this).attr('data-ledNum'));
			updateCurrentSceneVal($(this).attr('data-ledNum'));
			console.log(scene);
			App.doEditBegin("currentScene", scene);
			
		});
		updateLedStates();
	}
	
	function init(appMod) {
		App = appMod;
		$('#resource-list a').click(function (eobj) {
			App.doClose();
		});
		
	}
	
	function onIndicator(name, value) {
		var sel = $(sprintf('#resource-list-content li[data-resid="%s"] pre.ind-count', name));
		sel.text(sprintf(INDFMT, Number(sel.text()) + 1));
	}
	
	/* -------- EXPORTS -------- */
	var ResourceListView = {};
	ResourceListView.changePage = changePage;
	ResourceListView.display = display;
	ResourceListView.init = init;
	ResourceListView.onIndicator = onIndicator;
	return ResourceListView;
});
