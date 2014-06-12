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
	
	var MAX_FRAMES = 14;
	var MAX_SCENES = 4;
	var frames = [];
	var scenes = [];
	var currentFrameId = 1;
	var currentSceneId = 1;
	var curTime = 0;
	var delayVal = .5;
	var sending = false;
	//var mainLoop = setInterval(function(){tickHandler()}, 10);
	for(var i = 1; i <= MAX_SCENES; i++) {
		scenes[i] = {"sceneId":i,"maxRange":1,"minRange":1,"seqLength":1,"delay":1.2}
	}
	
	for(var i = 1; i < MAX_FRAMES; i++) {
		frames[i] = {"frameId":i,"led":["OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF"]}
	}
	
	
	var tempVal = {
		id: 0,
		count: 0
	}
	var liveStream = true;
	//var colors = [0, 0, 0, "blue","blue","blue","blue","blue","blue","white","white","white","white","white","white","blue"];
	var colors = [0, 0, 0, "blue","blue","blue","blue","blue","blue","white","white","white","white","white","white","blue"];
	var x = [0, 0, 0, 200,70,70,200,329,329,243.8,156.3,112.5,156.3,243.8,287.5,200];
	var y = [0, 0, 0, 50,125,275,350,275,125,124,124,200,275.8,275.8,200,200];
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
	var scaleFactor = 1;
	var translateFactorX = -mainBoard.ledsRadius;
	var translateFactorY = -mainBoard.ledsRadius;
	
	function updateCurrentFrameVal(ledNum) {
		if(frames[currentFrameId].led[ledNum] == "ON") {
		    frames[currentFrameId].led[ledNum] = "OFF";
		}
		else {
		    frames[currentFrameId].led[ledNum] = "ON";
		}
	}
	function updateStates(ledNum) {
	    if(frames[currentFrameId].led[ledNum] == "ON") {
			ledOff(ledNum);
		}
		else {
			ledOn(ledNum);
		}
	}
	
	function updateLedStates() {
		for(var ledNum = 2; ledNum <= 15; ledNum++) {
			if(frames[currentFrameId].led[ledNum] == "ON") {
				ledOn(ledNum);
			}
			else {
				ledOff(ledNum);
			}
		}
		
	}
	
	function sendCurrentFrame() {
		App.doEditBegin("currentFrame", frames[currentFrameId]);
		
	}
	
	function setSending(val) {
		sending = val;
		if(val == false) {
			$("#loading").html("Loaded.");
			setTimeout(function(){$("#loading").html(""); changeFrameAndSceneId(1)}, 700);
		} else {
			$("#loading").html("Loading Frames and Scenes...");
		}
	}
	
	function increaseTemp(num) {
		if(num == currentFrameId) {
			tempVal.id = num;
			tempVal.count++;
		} else {
			tempVal.count = 0;
			tempVal.id = 0;
		}
	}
	
	function addFrameToCurrentScene() {
		//if(scenes[currentSceneId].maxRange < SceneFrameMax) {
			scenes[currentSceneId].maxRange += 1;

			var m = parseInt($("#points").attr("max"));
			$("#points").attr("max", (m + 1).toString());
			//$("#points").slider("refresh");
			$("#points").val((m + 1)).slider("refresh");
			changeFrameId($("#points").val());
		//}
	}
	
	function setCurrentFrameId(v) {
		currentFrameId = v;
	}
	
	function setCurrentSceneId(v) {
		currentSceneId = v;
		console.log("Current Scene Id is" + currentSceneId);
		$("#points").attr("max", scenes[currentSceneId].maxRange);
			//$("#points").slider("refresh");
		$("#points").slider("refresh");
	}
	
	function changeFrameId(frameNum) {
		currentFrameId = frameNum;//scenes[currentSceneId].seqLength;
		if(connected) {
			App.doEditBegin("currentFrameId", currentFrameId);
			//App.doEditBegin("currentFrameId", currentFrameId);

		}
		updateLedStates();
	
	}
	
	function changeFrameAndSceneId(frameNum) {
		currentSceneId = frameNum;//scenes[currentSceneId].seqLength;
		currentFrameId = frameNum;//scenes[currentSceneId].seqLength;
		if(connected) {
			App.doTwoWrites("currentSceneId", currentSceneId, "currentFrameId", currentFrameId);
			//App.doEditBegin("currentFrameId", currentFrameId);

		}
		updateLedStates();
	
	}
	
	function changeDelay(val) {
		delayVal = val;
		if(connected) {
			scenes[currentSceneId].delay = val;
			App.doEditBegin("currentScene", scenes[currentSceneId]);
			//App.doEditBegin("currentFrameId", currentFrameId);
			console.log(val);
		}
		updateLedStates();
			
		
	}
	
	function sendScene() {
		if(connected) {
			App.doEditBegin("currentScene", scenes[currentSceneId]);
			console.log(scenes[currentSceneId]);
		}
	}
	
	function saveScene() {
		if(connected) {
			App.doEditBegin("saveToEEProm", "SAVE");
		}
	}
	
	function loadFrames() {
		/*currentFrameId = i;
		App.doEditBegin("currentFrameId", i, "currentFrame");
		changeFrameId(1);*/
		App.doWriteThenFunction("currentMode", "LOAD", function() {
			App.doManyWrites(ResourceListView.setCurrentFrameId, (function(){
				App.doManyWrites(ResourceListView.setCurrentSceneId, (function(){}), "currentSceneId", 1, MAX_SCENES - 1, "currentScene");
			}), "currentFrameId", 1, MAX_FRAMES, "currentFrame");
		});
		
		
		
		
	}
	
	function storeValue(name, val) {
		if(name == "currentFrame") {
			frames[currentFrameId] = val;
			console.log("Name is: " + name + " " + currentFrameId);
			console.log("Current Frame is");
			console.log(frames[currentFrameId]);
			updateLedStates();
		}
		
		if(name == "currentScene") {
			scenes[currentSceneId] = val;
			console.log("current Scene is: ");
			console.log(scenes[currentSceneId]);
		}
		
		
	}
	function recieveRes(rName, rVal) {
		if(rName == "currentFrame") {
			frames[currentFrameId] = rVal;
			console.log("Current frame should be "+frames[currentFrameId]+" taken from "+rVal);
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
			console.log(mode);
		}
	}
	
	
	function updateTimeline(redrawFlag) {
		for(var i = 0; i < scenes[currentSceneId].maxRange; i++) {
			//$("#timeline").find("ul").append(sprintf('<li><div class="tBoard" data-frameNum="%s" style="width: %spx; height: %spx; left: %spx; top: %spx;" ></div></li>', scenes[currentSceneId].frameList[i], 25, 25, 30 * i, 0));
			console.log(i);
		}
		
	}
	
	
	function display(schName, resTab) {
		$('#resource-list h1').text(schName);
		var noAppDiv = true;
		var noSysDiv = true;
		
		if(connected) {
			loadFrames();
		}
		
		var html = "";
		console.log("Entering Resource Display");
		html += sprintf("<div id='mainBoard' class='board' style='width: %dpx; height: %dpx' >", mainBoard.width, mainBoard.width);
		for(var i = 2; i <= 15; i++) {
			html += sprintf("<div class='boardLed mainBoardLed' data-color='%s'  data-resid='currentFrame' data-ledNum='%s' style='left: %spx; top: %spx; width: %spx; height: %spx' ></div>", colors[i], i, x[i] * scaleFactor + translateFactorX, y[i] * scaleFactor + translateFactorY, mainBoard.ledsRadius  * 2, mainBoard.ledsRadius * 2, mainBoard.ledsRadius, mainBoard.ledsRadius);
		}
		html += sprintf("</div>");
		
		/*html += sprintf("<div id='timeline-container'><ul id='timeline'>");
		for(var j = 0; j <= MAX_FRAMES; j++) {
			html += sprintf("<li class='frameSlot' data-slotNum='%s'>", i);
			html += sprintf("<div class='board' data-slotNum='%s' style='width: %dpx; height: %dpx' >", i, timeline.boards.width, timeline.boards.width);
		for(var i = 2; i <= 15; i++) {
			html += sprintf("<div class='boardLed .reslist-item' data-color='%s'  data-resid='currentFrame' data-ledNum='%s' style='left: %spx; top: %spx; width: %spx; height: %spx' ></div>", colors[i], i, (x[i] * scaleFactor + translateFactorX) / 4, (y[i] * scaleFactor + translateFactorY, timeline.boards.ledsRadius * 2, timeline.boards.ledsRadius * 2) , timeline.boards.ledsRadius, timeline.boards.ledsRadius);
		}
		html += sprintf("</div>");
		html += sprintf("</li>");
		}
		html += sprintf("</ul></div>");*/
		html += sprintf('<div><p id="loading"></p></div>');
		html += sprintf('<a href="#" id="addFrame" data-icon="plus">Add New Frame</a>');
		html += sprintf('<input data-type="range" id="points" value="1" min="1" max="%s">', scenes[currentSceneId].maxRange);
		//html += sprintf('<input data-type="input" id="points" value="1">');
		/*html += sprintf('<div id="timeline">');
		
		html += sprintf('<ul class="horizontal">');
		html += sprintf('</ul>');
		html += sprintf('</div>');*/
		html += sprintf('<input data-type="range" id="delay" value=".2" min=".1" max="5.0" step=".100" >');
		html += sprintf("<a class='%sonnect button' >%sonnect</a>", connected ? "Disc" : "C", connected ? "Disc" : "C");
		html += sprintf("<a class='%s button' >%s</a>", "PLAY", "PLAY");
		html += sprintf("<a class='%s button' >%s</a>", "EDIT", "EDIT");
		//html += sprintf("<a class='%s button' >%s</a>", "Send", "Send");
		html += sprintf("<a class='%s button' >%s</a>", "Save", "Save");
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

			//App.doRead("currentScene");
		
		var $ul = $('#resource-list-content ul');
		$ul.html(html);

		
		console.log(frames);
		//updateTimeline(true);
		//$ul.listview('refresh');
		//changeFrameId(1);
		$('#mainBoard').css({"-webkit-transform" : "scale(.7, .7) translate(-60px, -60px)", });
		
		
		$('.reslist-item').click(function (eobj) {
			App.doEditBegin(eobj.currentTarget.dataset['resid']);
		});
		
		$ul.find('input[data-type="range"]').slider({mini: true, theme: 'b'});
		$ul.find('input').textinput({mini: true, theme: 'b'});
		$ul.find('.button').button({mini: true, theme: 'b'});
		
		
		$('.mainBoardLed').click(function (eobj) {
			updateStates($(this).attr('data-ledNum'));
			updateCurrentFrameVal($(this).attr('data-ledNum'));
			console.log(frames[currentFrameId]);
			if(connected == true && liveStream == true) 
				App.doEditBegin("currentFrame", frames[currentFrameId]);
		});
		
		$("#addFrame").button();
		$("#addFrame").click(function() {
			addFrameToCurrentScene();
		});
		$("#points").on('slidestop', function() {
			changeFrameId($(this).val());
		});
		
		$("#delay").on('slidestop', function() {
			changeDelay($(this).val());
			//sendScene();
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
		
		$(".tBoard").click(function(e) {
			changeFrameId($(this).attr("data-frameNum"));
		});
		
		$(".PLAY").click(function() {
			if(connected) {
				App.doTwoWrites("currentScene",scenes[currentSceneId],     "currentMode","PLAY");
			}
		});
		
		$(".Send").click(function() {
			sendScene();
		});
		
		$(".Save").click(function() {
			saveScene();
		});
		
		$(".EDIT").click(function() {
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
	ResourceListView.changeFrameId = changeFrameId;
	ResourceListView.recieveRes = recieveRes;
	ResourceListView.sendScene = sendScene; 
	ResourceListView.updateTimeline = updateTimeline;
	ResourceListView.storeValue = storeValue;
	ResourceListView.frames = frames;
	ResourceListView.setCurrentFrameId = setCurrentFrameId;
	ResourceListView.setCurrentSceneId = setCurrentSceneId;
	ResourceListView.setSending = setSending;
	return ResourceListView;
});
