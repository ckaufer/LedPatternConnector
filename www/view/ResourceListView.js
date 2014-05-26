if (typeof define !== 'function') { var define = require('amdefine')(module); }

define (function (require) {

	"use strict";

	var INDFMT = "%3d";
	var connected = false;
	var App;
	var DeviceListView;
	var SLIDER = 'ui-input-text ui-body-c ui-corner-all ui-shadow-inset ui-mini ui-slider-input';
	var BUTTON = 'ui-btn';
	var mode = "EDIT";
	
	var MAX_SCENES = 10;
	var MAX_SEQUENCES = 3;
	var scenes = [];
	var sequences = [];
	var currentSceneId = 0;
	var currentSequenceId = 0;
	for(var i = 0; i <= MAX_SEQUENCES; i++) {
		sequences[i] = {"sequenceId":i,"maxRange":10,"minRange":0,"seqLength":0,"sceneList":[0,1,2,3,4,5,6,7,8,9]}
	}
	
	for(var i = 0; i <= MAX_SCENES; i++) {
		scenes[i] = {"sceneId":i,"led":["OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF"]}
	}
	
	
	var tempVal = {
		id: 0,
		count: 0
	}
	var liveStream = true;
	//var colors = [0, 0, 0, "blue","blue","blue","blue","blue","blue","white","white","white","white","white","white","blue"];
	var colors = [0, 0, "red","green","red","green","red","green","red","orange","orange","orange","blue","blue","yellow","yellow"];
	var x = [0,0,
	80,80,80,80,80,80,80,
	5,  5, 5, 5, 5, 5, 5];
	
	var y = [0,0,
	165,140,115,90,65,35,10,
	165,140,115,90,65,35, 7];
	//var x = [0, 0, 0, 200,70,70,200,329,329,243.8,156.3,112.5,156.3,243.8,287.5,200];
	//var y = [0, 0, 0, 50,125,275,350,275,125,124,124,200,275.8,275.8,200,200];
	
	var mainBoard = {
		width: 400,
		ledsRadius: 400 / 27
	}
	console.log(mainBoard);
	var timeline = {
		boards: {
			width: 100,
			ledsRadius: 100 / 27
		},
		
	}
	console.log(timeline);
	var scaleFactor = 2;
	var translateFactorX = -mainBoard.ledsRadius + 120;
	var translateFactorY = -mainBoard.ledsRadius + 20;
	
	function updateCurrentSceneVal(ledNum) {
		if(scenes[currentSceneId].led[ledNum] == "ON") {
		    scenes[currentSceneId].led[ledNum] = "OFF";
		}
		else {
		    scenes[currentSceneId].led[ledNum] = "ON";
		}
	}
	function updateStates(ledNum) {
	    if(scenes[currentSceneId].led[ledNum] == "ON") {
			ledOff(ledNum);
		}
		else {
			ledOn(ledNum);
		}
	}
	
	function updateLedStates() {
		for(var ledNum = 2; ledNum <= 15; ledNum++) {
			if(scenes[currentSceneId].led[ledNum] == "ON") {
				ledOn(ledNum);
			}
			else {
				ledOff(ledNum);
			}
		}
		
	}
	
	function sendCurrentScene() {
		App.doEditBegin("currentScene", scenes[currentSceneId]);
	}
	
	function increaseTemp(num) {
		if(num == currentSceneId) {
			tempVal.id = num;
			tempVal.count++;
		} else {
			tempVal.count = 0;
			tempVal.id = 0;
		}
	}
	
	function changeSceneId(sceneNum) {
		increaseTemp(sceneNum);
		if(tempVal.count > 1) {
			console.log("too big");
			return;
		} else {
			console.log("just right");
			currentSceneId = sceneNum;
			if(connected) {
				App.doEditBegin("currentSceneId", currentSceneId);
				//App.doEditBegin("currentSceneId", currentSceneId);
			}
			updateLedStates();
			
		}
	}
	
	function recieveRes(rName, rVal) {
		if(rName == "currentScene") {
			scenes[currentSceneId] = rVal;
			console.log("Current Scene should be "+scenes[currentSceneId]+" taken from "+rVal);
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
	}
	
	function setMode(val) {
		mode = val;
		if(connected) {
			App.doEditBegin("currentMode", mode);
			App.doEditBegin("currentSequence", sequences[currentSequenceId]);
			console.log(mode);
			console.log(sequences[currentSequenceId]);
		}
	}
	
	
	function display(schName, resTab) {
		$('#resource-list h1').text(schName);
		var noAppDiv = true;
		var noSysDiv = true;
		
		var html = "";
		console.log("Entering Resource Display");
		html += sprintf("<div id='mainBoard' class='board' style='width: %dpx; height: %dpx' >", mainBoard.width, mainBoard.width);
		for(var i = 2; i <= 15; i++) {
			html += sprintf("<div class='boardLed mainBoardLed' data-color='%s'  data-resid='currentScene' data-ledNum='%s' style='left: %spx; top: %spx; width: %spx; height: %spx' ></div>", colors[i], i, x[i] * scaleFactor + translateFactorX, y[i] * scaleFactor + translateFactorY, mainBoard.ledsRadius  * 2, mainBoard.ledsRadius * 2, mainBoard.ledsRadius, mainBoard.ledsRadius);
		}
		html += sprintf("</div>");
		
		/*html += sprintf("<div id='timeline-container'><ul id='timeline'>");
		for(var j = 0; j <= MAX_SCENES; j++) {
			html += sprintf("<li class='sceneSlot' data-slotNum='%s'>", i);
			html += sprintf("<div class='board' data-slotNum='%s' style='width: %dpx; height: %dpx' >", i, timeline.boards.width, timeline.boards.width);
		for(var i = 2; i <= 15; i++) {
			html += sprintf("<div class='boardLed .reslist-item' data-color='%s'  data-resid='currentScene' data-ledNum='%s' style='left: %spx; top: %spx; width: %spx; height: %spx' ></div>", colors[i], i, (x[i] * scaleFactor + translateFactorX) / 4, (y[i] * scaleFactor + translateFactorY, timeline.boards.ledsRadius * 2, timeline.boards.ledsRadius * 2) , timeline.boards.ledsRadius, timeline.boards.ledsRadius);
		}
		html += sprintf("</div>");
		html += sprintf("</li>");
		}
		html += sprintf("</ul></div>");*/
		
		html += sprintf('<input data-type="range" id="points" value="0" min="0" max="10">');
		html += sprintf("<a class='%sonnect button' >%sonnect</a>", connected ? "Disc" : "C", connected ? "Disc" : "C");
		html += sprintf("<a class='%s button' >%s</a>", mode == "PLAY" ? "EDIT" : "PLAY", mode == "PLAY" ? "EDIT" : "PLAY");
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
		//$ul.listview('refresh');

		$('#mainBoard').css({"-webkit-transform" : "scale(.7, .7) translate(-60px, -60px)", });
		updateLedStates();
		if(connected == true) 
			sendCurrentScene();
		
		$('.reslist-item').click(function (eobj) {
			App.doEditBegin(eobj.currentTarget.dataset['resid']);
		});
		
		$ul.find('input[data-type="range"]').slider({mini: true, theme: 'b'});
		$ul.find('input').textinput({mini: true, theme: 'b'});
		$ul.find('.button').button({mini: true, theme: 'b'});
		
		$('.mainBoardLed').mouseenter(function (eobj) {
			updateStates($(this).attr('data-ledNum'));
			updateCurrentSceneVal($(this).attr('data-ledNum'));
			console.log(scenes[currentSceneId]);
			if(connected == true && liveStream == true) 
				App.doEditBegin("currentScene", scenes[currentSceneId]);
		});
		
		$("#points").on('slidestop', function() {
			changeSceneId($(this).val());
		});
		
		$(".Disconnect").click(function(e) {
		if(connected == true){
			App.doClose();
		}
		});
		
		$('.Connect').click(function (eobj) {
			//App.doClose();
			DeviceListView.changePage(false);
			App.doScan();
			
			console.log("clicked");
		});
		
		$(".Play").click(function() {
			setMode("PLAY");
		});
		
		$(".Edit").click(function() {
			setMode("EDIT");
		});
		console.log("finished display");
		
	}
	
	function init(appMod, dList) {
		App = appMod;
		DeviceListView = dList;
		
		
		
		
	}
	
	function setConnected(val) {
		connected = val;
	}
	
	function onIndicator(name, value) {
		/*var sel = $(sprintf('#resource-list-content li[data-resid="%s"] pre.ind-count', name));
		sel.text(sprintf(INDFMT, Number(sel.text()) + 1));*/
	}
	
	/* -------- EXPORTS -------- */
	var ResourceListView = {};
	ResourceListView.changePage = changePage;
	ResourceListView.display = display;
	ResourceListView.init = init;
	ResourceListView.onIndicator = onIndicator;
	ResourceListView.setConnected = setConnected;
	ResourceListView.changeSceneId = changeSceneId;
	ResourceListView.recieveRes = recieveRes;
	return ResourceListView;
});
