import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { decode as base64Decode } from 'base-64';
import { useSensorStore } from '../stores/sensorStore';

const SERVICE_UUID =
  process.env.EXPO_PUBLIC_BLE_SERVICE_UUID || '12345678-1234-1234-1234-123456789abc';
const CHARACTERISTIC_UUID =
  process.env.EXPO_PUBLIC_BLE_CHARACTERISTIC_UUID || 'abcd1234-ab12-ab12-ab12-abcdef123456';
const DEVICE_NAME = process.env.EXPO_PUBLIC_BLE_DEVICE_NAME || 'Ma3akBand';
const SCAN_TIMEOUT_MS = 15000;

const decodeBase64 = (value: string) => {
  try {
    return base64Decode(value);
  } catch {
    throw new Error('Base64 decode failed');
  }
};

let BleManager: any;
let bleManager: any = null;

try {
  const bleModule = require('react-native-ble-plx');
  BleManager = bleModule.BleManager;
  bleManager = new BleManager();
} catch {
  BleManager = null;
  bleManager = null;
}

interface UseBLEReturn {
  isScanning: boolean;
  isConnected: boolean;
  connectedDevice: any | null;
  startScan: () => Promise<void>;
  disconnect: () => Promise<void>;
  error: string | null;
}

interface BLESnapshot {
  isScanning: boolean;
  isConnected: boolean;
  connectedDevice: any | null;
  error: string | null;
}

let bleState: BLESnapshot = {
  isScanning: false,
  isConnected: false,
  connectedDevice: null,
  error: null,
};

let scanTimeout: ReturnType<typeof setTimeout> | null = null;
let monitorSubscription: any = null;
let disconnectSubscription: any = null;
let isConnecting = false;

const listeners = new Set<(state: BLESnapshot) => void>();

const emit = (partial: Partial<BLESnapshot>) => {
  bleState = { ...bleState, ...partial };
  listeners.forEach((listener) => listener(bleState));
};

const clearScanTimeout = () => {
  if (scanTimeout) {
    clearTimeout(scanTimeout);
    scanTimeout = null;
  }
};

const requestPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const androidVersion = Number(Platform.Version);

    if (androidVersion < 31) {
      const permission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
      const alreadyGranted = await PermissionsAndroid.check(permission);
      if (alreadyGranted) return true;

      const result = await PermissionsAndroid.request(permission);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    const results = await PermissionsAndroid.requestMultiple(permissions);
    return Object.values(results).every((result) => result === PermissionsAndroid.RESULTS.GRANTED);
  } catch (err) {
    emit({ error: `Permission error: ${err}` });
    return false;
  }
};

const parseSensorPayload = (value: string) => {
  const decodedString = decodeBase64(value);
  const data = JSON.parse(decodedString);

  return {
    bpm: Number(data.bpm || 0),
    gsr: Number(data.gsr || 0),
    ax: Number(data.ax || 0),
    ay: Number(data.ay || 0),
    az: Number(data.az || 0),
    recordedAt: new Date().toISOString(),
  };
};

const stopScan = () => {
  clearScanTimeout();
  if (bleManager) {
    try {
      bleManager.stopDeviceScan();
    } catch {
      // Scan may already be stopped.
    }
  }
  emit({ isScanning: false });
};

const connectToDevice = async (device: any) => {
  if (isConnecting || bleState.isConnected) return;
  isConnecting = true;
  stopScan();

  try {
    const connectedDev = await device.connect();
    const discoveredDevice = await connectedDev.discoverAllServicesAndCharacteristics();

    disconnectSubscription?.remove?.();
    monitorSubscription?.remove?.();

    disconnectSubscription = discoveredDevice.onDisconnected(() => {
      monitorSubscription?.remove?.();
      monitorSubscription = null;
      disconnectSubscription?.remove?.();
      disconnectSubscription = null;
      useSensorStore.getState().setConnected(false);
      emit({
        isConnected: false,
        connectedDevice: null,
        error: 'Band disconnected',
      });
    });

    monitorSubscription = discoveredDevice.monitorCharacteristicForNotifications(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error: any, characteristic: any) => {
        if (error) {
          emit({ error: `Notification error: ${error.message}` });
          return;
        }

        if (!characteristic?.value) return;

        try {
          useSensorStore.getState().updateMyData(parseSensorPayload(characteristic.value));
        } catch (parseError) {
          emit({ error: `Parse error: ${parseError}` });
        }
      }
    );

    useSensorStore.getState().setConnected(true);
    emit({
      isConnected: true,
      connectedDevice: discoveredDevice,
      error: null,
    });
  } catch (connectError) {
    useSensorStore.getState().setConnected(false);
    emit({
      isConnected: false,
      connectedDevice: null,
      error: `Connection error: ${connectError}`,
    });
  } finally {
    isConnecting = false;
  }
};

const startScan = async () => {
  if (!bleManager) {
    emit({ error: 'Bluetooth not available. Use an EAS build, not Expo Go.' });
    return;
  }

  if (bleState.isScanning || bleState.isConnected || isConnecting) return;

  emit({ error: null, isScanning: true });

  const hasPermissions = await requestPermissions();
  if (!hasPermissions) {
    emit({
      isScanning: false,
      error: 'Bluetooth permission denied. On Android 11, Location permission is required for BLE scan.',
    });
    return;
  }

  const managerState = await bleManager.state();
  if (managerState !== 'PoweredOn') {
    emit({
      isScanning: false,
      error: 'Turn on Bluetooth and Location, then try again.',
    });
    return;
  }

  clearScanTimeout();
  scanTimeout = setTimeout(() => {
    stopScan();
    emit({
      error: 'Scan timeout. Make sure the band is on, nearby, and Location is enabled on Android 11.',
    });
  }, SCAN_TIMEOUT_MS);

  bleManager.startDeviceScan(
    [SERVICE_UUID],
    { allowDuplicates: false },
    async (scanError: any, device: any) => {
      if (scanError) {
        stopScan();
        emit({ error: `Scan error: ${scanError.message}` });
        return;
      }

      if (!device || isConnecting || bleState.isConnected) return;

      const deviceName = device.name || device.localName;
      const serviceUuids = (device.serviceUUIDs || []).map((uuid: string) => uuid.toLowerCase());
      const matchesName = deviceName === DEVICE_NAME;
      const matchesService = serviceUuids.includes(SERVICE_UUID.toLowerCase());

      if (matchesName || matchesService || !deviceName) {
        await connectToDevice(device);
      }
    }
  );
};

const disconnect = async () => {
  try {
    stopScan();

    monitorSubscription?.remove?.();
    monitorSubscription = null;

    disconnectSubscription?.remove?.();
    disconnectSubscription = null;

    if (bleState.connectedDevice) {
      await bleState.connectedDevice.cancelConnection();
    }

    useSensorStore.getState().setConnected(false);
    emit({
      connectedDevice: null,
      isConnected: false,
      error: null,
    });
  } catch (disconnectError) {
    emit({ error: `Disconnect error: ${disconnectError}` });
  }
};

export default function useBLE(): UseBLEReturn {
  const [snapshot, setSnapshot] = useState<BLESnapshot>(bleState);

  useEffect(() => {
    listeners.add(setSnapshot);
    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  return {
    isScanning: snapshot.isScanning,
    isConnected: snapshot.isConnected,
    connectedDevice: snapshot.connectedDevice,
    startScan,
    disconnect,
    error: snapshot.error,
  };
}
