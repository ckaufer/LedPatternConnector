if (typeof define !== 'function') { var define = require('amdefine')(module); }

define (function (require) {

	"use strict";

	var $PAGE;
	var $HEADER;
	var $CONTENT;
	var $NAVBAR;
	
	var RESVAL = 'em-res-val';
	var SLIDER = 'ui-input-text ui-body-c ui-corner-all ui-shadow-inset ui-mini ui-slider-input';
	
	var App;
	var curRes;

	function changePage(reverse) {
		$.mobile.changePage($PAGE, {reverse: reverse, transition: 'slide'});
	}
	
	function display(res) {
		curRes = res;
		$HEADER.find('h1').text(curRes.name);
		var $r = $NAVBAR.find('#read');
		$r.attr('data-access', curRes.isReadable);
		$r[curRes.isReadable ? 'removeClass' : 'addClass']('ui-disabled');
		var $w = $NAVBAR.find('#write');
		$w.attr('data-access', curRes.isWriteable);
		$w[curRes.isWriteable ? 'removeClass' : 'addClass']('ui-disabled');
		var $wr = $NAVBAR.find('#writeread');
		$wr.attr('data-access', curRes.isWriteable && curRes.isReadable);
		$wr[curRes.isWriteable && curRes.isReadable ? 'removeClass' : 'addClass']('ui-disabled');
		$CONTENT.html(null);
		$CONTENT.html(displayRes(curRes, curRes.name));
		$CONTENT.find('input[type="text"]').textinput({mini: true, theme: 'b'});
		$CONTENT.find('input[data-type="range"]').slider({mini: true, highlight: true, theme: 'b'});
		$CONTENT.find('select').selectmenu({mini: true, theme: 'b'});
		refresh(true);
	}
	
	function displayRes(res, pre) {
		if (res.isScalar) {
			return displayScalar(res);
		}
		var html = "";
		res.children.forEach(function (r) {
			var path = sprintf((res.isStruct ? "%s.%s" : "%s[%s]"), pre, r.name);
			if (r.isScalar) {
				html += sprintf("<div class='label'><p class='label'><em-co>// %s</em-co></p></div>", path);
			}
			html += displayRes(r, path);
		});
	    return html;
	}
	
	function displayScalar(res) {
		var html = "";
		html += sprintf("<div class='cell-row'>");
		html += sprintf("<div class='cell-input'>");
		if (res.isInt || res.isNum) {
			html += sprintf("<input data-type='range' class='%s %s' value='' min='%f' max='%f' step='%f'/>",
					RESVAL, SLIDER, res.min, res.max, res.step);
		}
		else if (res.isEnum) {
			html += sprintf("<select class='%s'>", RESVAL);
			res.enumVals.forEach(function (e) {
				html += sprintf("<option value='%s'>%s</option>", e, e);
			});
			html += sprintf("</select>");
		}
		else {
			html += sprintf("<input class=' %s cell' type='text'/>", RESVAL);
		}
		html += sprintf("</div>");
		html += sprintf("<div class='cell-type'><p class='cell'>%s</p></div>", res.typeName);
		html += sprintf("</div>");
		return html;
	}
	
	function fetchLeaves() {
		var leaves = [];
		resValElems().each(function (i, e) {
			leaves.push($(e).val());
			$(e).val(null);
		});
		return leaves;
	}
	
	function init(appMod) {
		App = appMod;
		$PAGE = $('#resource-value');
		$HEADER = $('#resource-value-header');
		$CONTENT = $('#resource-value-content');
		$NAVBAR = $('#resource-value-footer-navbar');
		$HEADER.find('a').click(function () {
			App.doEditEnd();
		});
		$NAVBAR.find('#read').click(function () {
			App.doRead();
		});
		$NAVBAR.find('#write').click(function () {
			App.doWrite(false);
		});
		$NAVBAR.find('#writeread').click(function () {
			App.doWrite(true);
		});
	}
	
	function refresh(clear) {
		$CONTENT.find('input[data-type="range"]').slider('refresh');
		if (clear) {
			$CONTENT.find('input').val(null);
			$CONTENT.find('select').val(null);
		}
		$CONTENT.find('select').selectmenu('refresh');
		$NAVBAR.find('.ui-btn-active').removeClass('ui-btn-active');
	}
	
	function resValElems() {
		return $CONTENT.find('.' + RESVAL).not('span');
	}
	
	function storeLeaves(leaves) {
		resValElems().val(function (i) {
			return leaves[i];
		});
	}
	
	/* -------- EXPORTS -------- */
	var ResourceValueView = {};
	ResourceValueView.changePage = changePage;
	ResourceValueView.display = display;
	ResourceValueView.fetchLeaves = fetchLeaves;
	ResourceValueView.init = init;
	ResourceValueView.refresh = refresh;
	ResourceValueView.storeLeaves = storeLeaves;
	return ResourceValueView;
});
