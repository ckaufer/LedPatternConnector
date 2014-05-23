'use strict';

var sOnRecvFxn;
var sTraceFlag = false;

var SerialPacket;

function fail(err) {
	console.log("*** Mailbox error: " + err);
}

function init(SerPktMod) {
	SerialPacket = SerPktMod;
}

function onRecv(fxn) {
	sOnRecvFxn = fxn;
}

function open(cb) {
	cordova.exec(function () {
		cb();
		readNext();
	}, fail, "Mailbox", "open", []);
}

function readNext() {
	cordova.exec(function (buf) {
		var pkt = SerialPacket.create(new Uint8Array(buf));
		sTraceFlag && console.log(sprintf("recv: %s", pkt.getHdr()));
		pkt.rewind();
		sOnRecvFxn(pkt);
		readNext();
	}, fail, "Mailbox", "read", []);
}

function send(pkt) {
	sTraceFlag && console.log(sprintf("send: %s", pkt.getHdr()));
	var buf = Array.prototype.slice.call(pkt.buffer.subarray(0, pkt.length));
	cordova.exec(function () {}, fail, "Mailbox", "write", buf);
}

exports.init = init;
exports.onRecv = onRecv;
exports.open = open;
exports.send = send;

