import { useState, useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { decode as base64Decode } from 'base-64';
import { useSensorStore } from '../stores/sensorStore';

const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const CHARACTERISTIC_UUID = 'abcd1234-ab12-ab12-ab12-abcdef123456';
const DEVICE_NAME = 'Ma3akBand';
const SCAN_TIMEOUT_MS = 15000;

const decodeBase64 = (value: string) => {
  try {
    return base64Decode(value);
  } catch (err) {
    throw new Error('Base64 decode failed');
  }
};

let BleManager: any;
let bleManager: any = null;

try {
  const bleModule = require('react-native-ble-plx');
  BleManager = bleModule.BleManager;
  bleManager = new BleManager();
} catch (e) {
  // BLE not available (e.g., in Expo Go)
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

export default function useBLE(): UseBLEReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { updateMyData, setConnected } = useSensorStore();

  // Request Android permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      // Android 11 (API 30) and below — Bluetooth is auto-granted, only need location
      if (Platform.Version < 31) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }

      // Android 12+ (API 31+)
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(results).every(
        (result) => result === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      setError(`Permission error: ${err}`);
      return false;
    }
  };

  const startScan = async () => {
    if (!bleManager) {
      setError('Bluetooth not available (requires development build)');
      return;
    }

    if (isScanning) {
      return;
    }

    try {
      setError(null);
      setIsScanning(true);

      // Request permissions on Android
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        setError('Bluetooth permissions denied');
        setIsScanning(false);
        return;
      }

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      scanTimeoutRef.current = setTimeout(() => {
        try {
          bleManager.stopDeviceScan();
        } finally {
          setIsScanning(false);
          setError('Scan timeout. Make sure the band is on and nearby.');
        }
      }, SCAN_TIMEOUT_MS);

      // Start scanning
      bleManager.startDeviceScan(null, null, async (error: any, device: any) => {
        if (error) {
          setError(`Scan error: ${error.message}`);
          setIsScanning(false);
          return;
        }

        // Check if this is the Ma3akBand device
        const deviceName = device?.name || device?.localName;
        if (deviceName === DEVICE_NAME) {
          try {
            // Stop scanning
            bleManager.stopDeviceScan();
            setIsScanning(false);

            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current);
              scanTimeoutRef.current = null;
            }

            // Connect to device
            const connectedDev = await device.connect();
            await connectedDev.discoverAllServicesAndCharacteristics();
            setConnectedDevice(connectedDev);
            setIsConnected(true);
            setConnected(true);

            // Start monitoring the characteristic
            const sub = connectedDev.monitorCharacteristicForNotifications(
              SERVICE_UUID,
              CHARACTERISTIC_UUID,
              (error: any, characteristic: any) => {
                if (error) {
                  setError(`Notification error: ${error.message}`);
                  return;
                }

                if (characteristic?.value) {
                  try {
                    // Decode base64 to string
                    const decodedString = decodeBase64(characteristic.value);
                    const data = JSON.parse(decodedString);

                    // Update sensor store
                    updateMyData({
                      bpm: data.bpm,
                      gsr: data.gsr,
                      ax: data.ax,
                      ay: data.ay,
                      az: data.az,
                    });
                  } catch (parseError) {
                    setError(`Parse error: ${parseError}`);
                  }
                }
              }
            );

            setSubscription(sub);
          } catch (connectError) {
            setError(`Connection error: ${connectError}`);
            setIsScanning(false);
          }
        }
      });
    } catch (scanError) {
      setError(`Scan error: ${scanError}`);
      setIsScanning(false);
    }
  };

  const disconnect = async () => {
    try {
      if (isScanning && bleManager) {
        bleManager.stopDeviceScan();
        setIsScanning(false);
      }

      if (subscription) {
        subscription.remove();
        setSubscription(null);
      }

      if (connectedDevice) {
        await connectedDevice.cancelConnection();
      }

      setConnectedDevice(null);
      setIsConnected(false);
      setConnected(false);
      setError(null);
    } catch (disconnectError) {
      setError(`Disconnect error: ${disconnectError}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      if (bleManager) {
        bleManager.stopDeviceScan();
        bleManager.destroy();
      }
    };
  }, []);

  return {
    isScanning,
    isConnected,
    connectedDevice,
    startScan,
    disconnect,
    error,
  };
}
