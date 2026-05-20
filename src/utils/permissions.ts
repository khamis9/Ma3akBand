import { PermissionsAndroid, Platform, Alert } from 'react-native';

export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    // Android 11 (API 30) and below — Bluetooth is auto-granted, only need location
    if (Platform.Version < 31) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    // Android 12+ (API 31+) — request Bluetooth + Location
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    const allGranted = Object.values(granted).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      Alert.alert(
        'Permissions Required',
        'Please grant Location permission to connect to your device.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error('Permission request error:', err);
    return false;
  }
}
