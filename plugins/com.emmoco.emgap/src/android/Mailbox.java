package com.emmoco.emgap;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothProfile;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.emmoco.framework.SerialPacket;

public class Mailbox extends CordovaPlugin {

    public static final String TAG = "Em-Gap";
    
    static public final int ADVERT_PKT_LEN = 31;
    
    static private final int ADVERT_UUID_BASE = 5;
    static private final int ADVERT_DATA_LEN = 7;
    static private final int ADVERT_DATA_BASE = 9;

    static private final int BLE_PACKET_COUNT = 4;
	static private final int BLE_PACKET_SIZE = 20;

	static final private UUID EMMOCO_SERVICE = UUID.fromString("0000FFE0-0000-1000-8000-00805f9b34fb");

    static private final int INDICATOR_CHAR = 0;
	static private final int READVAL_CHAR = 1;
	static private final int READREQ_CHAR = 2;
	static private final int WRITEREQ_CHAR = 3;

    private static class ScanInfo {
    	String addr;
    	int rssi;
    	byte[] data;
    }
    
	private static BluetoothGattCharacteristic sCharIndicator;
	private static BluetoothGattCharacteristic sCharReadVal;
	private static BluetoothGattCharacteristic sCharReadReq;
	private static BluetoothGattCharacteristic sCharWriteReq;
    private static Context sContext;
	private static BluetoothDevice sDevice;
	private static int sFetchCnt;
    private static SerialPacket sFetchPkt = new SerialPacket();
    private static BluetoothGatt sGatt;
    private static SerialPacket.Header sSendHdr = new SerialPacket.Header();
    private static SerialPacket sSendPkt = new SerialPacket();
    private static BlockingQueue<SerialPacket> sRecvQueue = new LinkedBlockingQueue<SerialPacket>();
    private static ArrayList<ScanInfo> sScanInfoList;
    private static byte[] sStoreBuf;
    private static int sStoreOff;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext cbCtx) throws JSONException {
    	Log.i(TAG, "execute: " + action);
    	if (action.equals("open")) {
            execOpen(cbCtx);
            return true;
        }
        if (action.equals("read")) {
            execRead(cbCtx);
            return true;
        }
        if (action.equals("write")) {
            execWrite(args, cbCtx);
            return true;
        }
        return false;
    }
    
    @Override
    public void onNewIntent(Intent intent) {
    	Log.d(TAG, "onNewIntent");
    }

    @Override
    public void onDestroy() {
    	Log.d(TAG, "onDestory");
    	BluetoothAdapter.getDefaultAdapter().closeProfileProxy(BluetoothProfile.GATT, sGatt);
    }

    @Override
    public void onPause(boolean multitasking) {
    	Log.d(TAG, "onPause");
    }

    @Override
    public void onResume(boolean multitasking) {
    	Log.d(TAG, "onResume");
    }

    @Override
    public void onReset() {
    	Log.d(TAG, "onReset");
    }
    
    /* -------- PRIVATE FXNS -------- */
    
	private void enableNotification(BluetoothGattCharacteristic charac) {
    	sGatt.setCharacteristicNotification(charac, true);
    	BluetoothGattDescriptor desc = (BluetoothGattDescriptor) charac.getDescriptors().get(0);
    	desc.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
    	sGatt.writeDescriptor(desc);
	}
	
    private void execOpen(final CallbackContext cbCtx) {
    	BluetoothProfile.ServiceListener listener = new BluetoothProfile.ServiceListener() {
    		public void onServiceConnected(int profile, BluetoothProfile proxy) {
       	    	Log.d(TAG, "onServiceConnected");
                if (profile == BluetoothProfile.GATT) {
                    sGatt = (BluetoothGatt) proxy;
                }
    		}
    		public void onServiceDisconnected(int profile) {
                if (profile == BluetoothProfile.GATT) {
                	sGatt = null;
                }
    		}
    	};
    	sContext = cordova.getActivity().getApplicationContext();
    	BluetoothAdapter.getDefaultAdapter().getProfileProxy(sContext, listener, BluetoothProfile.GATT);
    	onDisconnect();
    	cbCtx.success();
    }
    
    private void execRead(final CallbackContext cbCtx) {
        cordova.getThreadPool().execute(new Runnable() {
            public void run() {
               	try {
					SerialPacket pkt = sRecvQueue.take();
					byte[] bytes = pkt.getBytes();
					cbCtx.success(bytes);
				}
               	catch (InterruptedException e) {
               		Log.e(TAG, e.getMessage());
				}
           }
        });
    }
    
    private void execWrite(final JSONArray args, final CallbackContext cbCtx) throws JSONException {
    	sSendPkt.rewind();
    	for (int i = 0; i < args.length(); i++) {
    		sSendPkt.addInt8(args.getInt(i));
    	}
    	sSendPkt.rewind();
    	sSendPkt.scanHeader(sSendHdr);
        cordova.getThreadPool().execute(new Runnable() {
            public void run() {
            	Log.i(TAG, "write: " + sSendHdr.kind);
            	switch (sSendHdr.kind) {
            	case CONNECT:
            		connect();
            		break;
            	case DISCONNECT:
            		disconnect();
            		break;
        		case FETCH:
        			fetch();
        			break;
            	case SCAN:
            		scan();
            		break;
        		case STORE:
        			store();
        			break;
            	default:
            		Log.e(TAG, String.format("execWrite: kind = %s", sSendHdr.kind));
            	}
            	cbCtx.success();
            }
        });
    }
    
    private void finishRead(SerialPacket pkt) {
    	try {
			sRecvQueue.put(pkt);
		}
    	catch (InterruptedException e) {
		}
    }
    
    private void reset() {
    	
    }
    
    /* -------- ACTIONS -------- */
    
    private void connect() {
    	int devId = (int)sSendPkt.scanUns32();
    	ScanInfo si = sScanInfoList.get(devId);
    	sDevice = BluetoothAdapter.getDefaultAdapter().getRemoteDevice(si.addr);
        sGatt = sDevice.connectGatt(sContext, true, sGattCallbacks);
        sGatt.connect();
    }
    
    private void connectDone() {
    	SerialPacket pkt = new SerialPacket();
    	pkt.addHeader(SerialPacket.Kind.CONNECT);
    	finishRead(pkt);
    }
    
    private void disconnect() {
		sGatt.disconnect();
		sGatt.close();
    }
    
    private void fetch() {
		sFetchPkt = new SerialPacket();
		sFetchPkt.addHeader(SerialPacket.Kind.FETCH_DONE, sSendHdr.resId);
		fetchNext();
    }
    
    private void fetchDone(byte[] bytes) {
		for (int i = 0; i < bytes.length; i++) {
			sFetchPkt.addInt8(bytes[i]);
		}
		if (bytes.length < BLE_PACKET_SIZE) {
			finishRead(sFetchPkt);
		}
		else if (--sFetchCnt == 0) {
			fetchNext();
		}
    }
    
    private void fetchNext() {
		sFetchCnt = BLE_PACKET_COUNT;
		byte[] data = new byte[] {(byte) sSendHdr.resId, (byte) sSendHdr.chan};
		sCharReadReq.setValue(data);
		sGatt.writeCharacteristic(sCharReadReq);
    }
    
    private void onDisconnect() {
    	SerialPacket pkt = new SerialPacket();
    	pkt.addHeader(SerialPacket.Kind.DISCONNECT);
    	finishRead(pkt);
    	reset();
    }
    
    private void onIndicator(byte[] bytes) {
		SerialPacket pkt = new SerialPacket();
		pkt.addHeader(SerialPacket.Kind.INDICATOR, bytes[0]);
		for (int i = 2; i < bytes.length; i++) {
			pkt.addInt8(bytes[i]);
		}
		finishRead(pkt);
    }
    
    private void scan() {
    	sScanInfoList = new ArrayList<ScanInfo>();
		sSendPkt.scanInt32();
		int duration = sSendPkt.scanInt16();
    	Log.i(TAG, "scan begin");
		BluetoothAdapter.getDefaultAdapter().startLeScan(sLeScanCallback);             
		new Timer().schedule(new TimerTask() {          
		    public void run() {
		    	scanDone();
		    	cancel();
		    }
		}, duration);
    }
    
    private void scanDone() {
    	Log.i(TAG, "scan done");
		BluetoothAdapter.getDefaultAdapter().stopLeScan(sLeScanCallback);
		SerialPacket pkt = new SerialPacket();
		pkt.addHeader(SerialPacket.Kind.SCAN_DONE, sScanInfoList.size());
		int idx = 0;
		for (ScanInfo si : sScanInfoList) {
			pkt.addInt8(si.rssi);
			pkt.addInt32(idx++);
			pkt.addInt16(0);
			pkt.addInt8(si.data.length);
			for (byte b : si.data) {
				pkt.addInt8(b);
			}
		}
		finishRead(pkt);
		
    }
    
    private void store() {
    	sStoreBuf = sSendPkt.getData();
		sStoreOff = 0;
		storeNext();
    }
    
    private void storeDone() {
		if (sStoreOff > 0) {
			storeNext();
			return;
		}
		SerialPacket pkt = new SerialPacket();
		pkt.addHeader(SerialPacket.Kind.STORE_DONE, sSendHdr.resId);
		finishRead(pkt);
    }
    
    private void storeNext() {
		int cnt = BLE_PACKET_COUNT;
		while (cnt-- > 0) {
			int beg = sStoreOff;
			int end = sStoreOff = (sStoreOff == 0) ? (BLE_PACKET_SIZE - 1) : (sStoreOff + BLE_PACKET_SIZE);
			if (end >= sStoreBuf.length) {
				end = sStoreBuf.length;
				sStoreOff = 0;
			}
			int len = (end - beg) + (beg == 0 ? 1 : 0);
			byte[] data = new byte[len];
			int idx = 0;
			if (beg == 0) {
				data[idx++] = (byte) sSendHdr.resId;
			}
			for (int i = beg; i < end; i++) {
				data[idx++] = sStoreBuf[i];
			}
			sCharWriteReq.setValue(data);
			boolean respFlag = sStoreOff == 0 || cnt == 0;
        	sCharWriteReq.setWriteType(respFlag ? BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT : BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
			sGatt.writeCharacteristic(sCharWriteReq);
			if (respFlag) {
				break;
			}
		}
    	
    }
    
    /* -------- BLE CALLBACKS -------- */
    
    private BluetoothAdapter.LeScanCallback sLeScanCallback = new BluetoothAdapter.LeScanCallback() {
        public void onLeScan(final BluetoothDevice device, int rssi, byte[] rec) {
           	if (rec[ADVERT_UUID_BASE] != (byte)0xE0 || rec[ADVERT_UUID_BASE + 1] != (byte)0xFF) {
           		return;
           	}
           	ScanInfo si = new ScanInfo();
           	si.addr = device.getAddress();
           	si.rssi = rssi;
           	si.data = Arrays.copyOfRange(rec, ADVERT_DATA_BASE, ADVERT_DATA_BASE + rec[ADVERT_DATA_LEN] - 1);
           	sScanInfoList.add(si);
        	Log.i(TAG, String.format("found %s, rssi = %d, data.len = %d", si.addr, si.rssi, si.data.length));
        }
    };

    private BluetoothGattCallback sGattCallbacks = new BluetoothGattCallback() {
    	
    	public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
    		super.onCharacteristicChanged(gatt, characteristic);
    		if (characteristic == sCharIndicator) {
    			onIndicator(characteristic.getValue());
    		}
    		else {
    			fetchDone(characteristic.getValue());
    		}
    	}
    	
    	public void onDescriptorWrite(BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
    		super.onDescriptorWrite(gatt, descriptor, status);
        	if (descriptor.getCharacteristic() == sCharIndicator) {
	    		enableNotification(sCharReadVal);
	    	}
	    	else {
	    		connectDone();
	    	}
    	}
    	
    	public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
    	};
    	
    	public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
    		super.onCharacteristicWrite(gatt, characteristic, status);
        	if (characteristic == sCharWriteReq) {
        		storeDone();
        	}
    	}
    	
    	public void onServicesDiscovered(BluetoothGatt gatt, int status) {
        	List<BluetoothGattCharacteristic> cl = sGatt.getService(EMMOCO_SERVICE).getCharacteristics();
        	sCharIndicator = cl.get(INDICATOR_CHAR);
        	sCharReadVal = cl.get(READVAL_CHAR);
        	sCharReadReq = cl.get(READREQ_CHAR);
        	sCharWriteReq = cl.get(WRITEREQ_CHAR);
        	sCharReadReq.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
        	sCharWriteReq.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
        	enableNotification(sCharIndicator);
    	};
    	
    	@Override
    	public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
    		if (newState == BluetoothProfile.STATE_CONNECTED) {
            	sGatt.discoverServices();
            }
            if (newState == BluetoothProfile.STATE_DISCONNECTED) {
            	onDisconnect();
            }
    	};
    };

}
