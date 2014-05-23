if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports) {

	'use strict';
	
	/* -------- IMPORTS -------- */
	var DeviceList = require('com.emmoco.core/DeviceList');
	var SchemaWrapper = require('com.emmoco.core/SchemaWrapper');
	var SerialPacket = require('com.emmoco.core/SerialPacket');
	var Utils = require('com.emmoco.core/Utils');
	
	var Mailbox;
	
	var FILE_NONE = -1;
	var FILE_PREP = -2;
	
	var Kind = SerialPacket.PktKind;
	var Op = Utils.EnumT(
		'NONE',
		'CLOSE',
		'OPEN',
		'READ',
		'SCAN',
		'WRITE'
	);
	
	var sCurDev = null;
	var sCurFileIdx = FILE_NONE;
	var sCurOp = Op.NONE;
	var sCurOpCB = null;
	var sCurVal = null;
	var sDevTab = {};
	var sDisconnectResId;
	var sFileIdxResId;
	var sInPkt = SerialPacket.create();
	var sOnDisconnectFxn;
	var sOnIndicatorFxn;
	var sReqPkt = SerialPacket.create();
	
	/* -------- PUBLICS -------- */

	function DeviceDesc() {}
	
	DeviceDesc.prototype.toString = function() {
		return Utils.sprintf("<DeviceDesc %s>", this.deviceId, this.rssi);
	};

	function addSchema(jsonObj) {
		var sw = SchemaWrapper.addSchema(jsonObj);
		if (!sDisconnectResId) {
			sDisconnectResId = sw.mkResourceValue('$mcmDisconnect').resourceId;
			sFileIdxResId = sw.mkResourceValue('$fileIndexReset').resourceId;
		}
		return sw.schemaId;
	}
	
	function closeDevice() {
		sCurOp = Op.CLOSE;
		sReqPkt.rewind();
		sReqPkt.addHdr(Kind.DISCONNECT);
		Mailbox.send(sReqPkt);
	}
	
	function onDisconnect(fxn) {
		sOnDisconnectFxn = fxn;
	}
	
	function onIndicator(fxn) {
		sOnIndicatorFxn = fxn;
	}
	
	function openDevice(deviceDesc, callback) {
		sCurOp = Op.OPEN;
		sCurOpCB = callback;
		sCurDev = sDevTab[deviceDesc.deviceId];
		if (!sCurDev.sw) {
			throw Error("ConnectionMgr.openDevice: no schema");
		}
		sReqPkt.rewind();
		sReqPkt.addHdr(Kind.CONNECT);
		for (var i = 0; i < sCurDev.addr.length; i++) {
			sReqPkt.addInt8(sCurDev.addr[i]);
		}
		Mailbox.send(sReqPkt);
	}
	
	function readResource(resourceName, callback) {
		var err = validate(resourceName, 'r');
		if (err) {
			throw Error(Utils.sprintf("ConnectionMgr.readResource: %s", err));
		}
		sCurOp = Op.READ;
		sCurOpCB = callback;
		sCurVal = sCurDev.sw.mkResourceValue(resourceName);
		sReqPkt.rewind();
		if (sCurVal.isFile) {
			filePrepare();
		}
		else {
			sReqPkt.addHdr(Kind.FETCH, sCurVal.resourceId);
			Mailbox.send(sReqPkt);
		}
}
	
	function scanDevices(duration, callback) {
		sCurOp = Op.SCAN;
		sCurOpCB = callback;
		DeviceList.beginCycle();
		sReqPkt.rewind();
		sReqPkt.addHdr(Kind.SCAN);
		sReqPkt.addInt32(~0);
		sReqPkt.addInt16(duration);
		Mailbox.send(sReqPkt);
	}
	
	function writeResource(resourceName, value, callback) {
		var err = validate(resourceName, 'w');
		if (err) {
			throw Error(Utils.sprintf("ConnectionMgr.writeResource: %s", err));
		}
		sCurOp = Op.WRITE;
		sCurOpCB = callback;
		sCurVal = sCurDev.sw.mkResourceValue(resourceName);
		sCurVal.value = value;
		sReqPkt.rewind();
		if (sCurVal.isFile) {
			filePrepare();
		}
		else {
			sReqPkt.addHdr(Kind.STORE, sCurVal.resourceId);
			sCurVal.addData(sReqPkt);
			Mailbox.send(sReqPkt);
		}
	}
	
	function _start(Mbx, callback) {
		Mailbox = Mbx;
		Mailbox.onRecv(dispatch);
		Mailbox.open(function () {
			callback && callback();
		});
	}
	
	/* -------- PRIVATES -------- */

	function dispatch(pkt) {
		pkt.rewind();
		var hdr = pkt.scanHdr();
		switch (hdr.kind) {
		case Kind.CONNECT:
			onConnectPkt();
			break;
		case Kind.DISCONNECT:
			onDisconnectPkt();
			break;
		case Kind.FETCH_DONE:
			if (sCurFileIdx == FILE_NONE) {
				onFetchDonePkt(pkt);
			}
			else if (sCurOp == Op.READ) {
				fileRead(pkt);
			}
			else {
				fileWrite(pkt);
			}
			break;
		case Kind.INDICATOR:
			onIndicatorPkt(hdr, pkt);
			break;
		case Kind.SCAN_DONE:
			onScanDonePkt(pkt);
			break;
		case Kind.STORE_DONE:
			if (sCurFileIdx == FILE_NONE) {
				onStoreDonePkt();
			}
			else if (sCurOp == Op.READ) {
				fileRead(pkt);
			}
			else {
				fileWrite(pkt);
			}
			break;
		}
	}
	
	function filePrepare() {
		sReqPkt.addHdr(Kind.STORE, sFileIdxResId);
		sReqPkt.addInt16(0);
		sCurFileIdx = FILE_PREP;
		if (sCurOp == Op.READ) {
			sCurVal.value = [];
			sCurVal.fileStore();
		}
		else {
			sCurVal.fileFetch();
		}
		Mailbox.send(sReqPkt);
	}
	
	function fileRead(pkt) {
		if (sCurFileIdx == FILE_PREP) {
			sCurFileIdx = 0;
		}
		else {
			var sz = pkt.getHdr().size - SerialPacket.HDR_SIZE;
			sCurVal.scanData(pkt, sz);
			if (sz < SerialPacket.DATA_SIZE) {
				sCurFileIdx = FILE_NONE;
				opDone(null, sCurVal.value);
				return;
			}
			sCurFileIdx += SerialPacket.DATA_SIZE;
		}
		sReqPkt.rewind();
		sReqPkt.addHdr(Kind.FETCH, sCurVal.resourceId, 1);
		Mailbox.send(sReqPkt);
	}
	
	function fileWrite() {
		if (sCurVal.fileEof) {
			sCurFileIdx = FILE_NONE;
			opDone(null, sCurVal.value);
			return;
		}
		sCurFileIdx = (sCurFileIdx == FILE_PREP) ? 0 : (sCurFileIdx + SerialPacket.DATA_SIZE);
		sReqPkt.rewind();
		sReqPkt.addHdr(Kind.STORE, sCurVal.resourceId);
		sCurVal.addData(sReqPkt);
		Mailbox.send(sReqPkt);
	}
	
	function initDevDesc(dev) {
		var sw = dev.sw;
		this.deviceId = dev.id;
		this.deviceName = dev.name;
		this.rssi = dev.rssi;
		this.schemaHash = dev.hash;
		this.schemaId = sw ? sw.schemaId : null;
		this.schemaName = sw ? sw.name : null;
		this.broadcast = null;
		if (!sw || dev.extra.length == 0) return;
		var rv = sw.mkBroadcastValue();
		if (!rv) return;
		var pkt = SerialPacket.create(dev.extra);
		pkt.rewind();
		rv.scanData(pkt);
		this.broadcast = rv.value;
	}
	
	function onConnectPkt() {
		opDone(null);
	}
	
	function onDisconnectPkt() {
		reset(null);
		sOnDisconnectFxn && sOnDisconnectFxn();
	}
	
	function onFetchDonePkt(pkt) {
		sCurVal.scanData(pkt);
		opDone(null, sCurVal.value);
	}
	
	function onIndicatorPkt(hdr, pkt) {
		if (!sCurDev) return;
		var rv = sCurDev.sw.mkResourceValue(hdr.resId);
		rv.scanData(pkt);
		sOnIndicatorFxn && sOnIndicatorFxn(rv.name, rv.value);
	}
	
	function onScanDonePkt(pkt) {
		DeviceList.add(pkt.getData());
		sDevTab = DeviceList.endCycle();
		var dnArr = [];
		var devDescArr = [];
		for (var dn in sDevTab) {
			dnArr.push(dn);
		}
		dnArr.sort().forEach(function (dn) {
			var desc = new DeviceDesc();
			initDevDesc.call(desc, sDevTab[dn]);
			devDescArr.push(desc);
			devDescArr[dn] = desc;
			
		});
		opDone(null, devDescArr);
	}
	
	function onStoreDonePkt() {
		opDone(null);
	}
	
	function opDone(err, arg) {
		var cb = sCurOpCB;
		reset(sCurDev);
		if (cb) cb(err, arg);
	}
	
	function reset(dev) {
		sCurDev = dev;
		sCurOp = Op.NONE;
		sCurOpCB = null;
		sCurVal = null;
	}
	
	function validate(rn, op) {
		var rv = sCurDev.sw.getResources()[rn];
		if (!rv) return Utils.sprintf("no resource named '%s'", rn);
		switch (op) {
		case 'r':
			if (!rv.isReadable) return Utils.sprintf("resource '%s' not readable", rn);
			break;
		case 'w':
			if (!rv.isWriteable) return Utils.sprintf("resource '%s' not writeable", rn);
			break;
		}
		return null;
	}
	
	/* -------- EXPORTS -------- */

	exports._start = _start;
	exports.closeDevice = closeDevice;
	exports.addSchema = addSchema;
	exports.onDisconnect = onDisconnect;
	exports.onIndicator = onIndicator;
	exports.openDevice = openDevice;
	exports.readResource = readResource;
	exports.scanDevices = scanDevices;
	exports.writeResource = writeResource;
});