/**
 * ANDROID BACKEND — Bluetooth Classic (RFCOMM)
 * --------------------------------------------------------------------------
 * `BluetoothApi` sözleşmesinin `react-native-bluetooth-classic` ile uygulanması.
 * Tüm native çağrılar burada kapsüllenir; frontend bu dosyayı hiç tanımaz.
 * Bu proje yalnızca Bluetooth Classic kullanır (BLE yoktur).
 */
import { PermissionsAndroid } from "react-native";
import RNBluetoothClassic, {
  BluetoothDevice as NativeDevice,
} from "react-native-bluetooth-classic";
import type {
  BluetoothApi,
  ConnectedDevice,
  ScanHandlers,
  ScannedDevice,
  Subscription,
} from "..";

/** Classic bağlantı seçenekleri (RFCOMM / satır sonu sınırlayıcılı metin). */
const CONNECTION_OPTIONS = {
  connectorType: "rfcomm",
  connectionType: "binary",
  delimiter: "\n",
  encoding: "utf-8",
} as const;

const SCAN_TIMEOUT_MS = 12000;

/** Native cihazı sözleşmedeki ConnectedDevice'e sarmalar. */
const wrapConnectedDevice = (device: NativeDevice): ConnectedDevice => ({
  id: device.id ?? device.address,
  address: device.address,
  name: device.name ?? "Bilinmeyen Cihaz",
  write: async (data: string) => {
    await device.write(data);
  },
  disconnect: async () => {
    await device.disconnect();
  },
  onDataReceived: (listener) => {
    // Çözülmüş metni doğrudan iletiriz; frontend ek bir kod çözme yapmaz.
    const sub = device.onDataReceived((event) => {
      listener({ data: event.data });
    });
    return { remove: () => sub.remove() };
  },
});

let scanTimeout: ReturnType<typeof setTimeout> | null = null;
let scanActive = false;

export const androidBackend: BluetoothApi = {
  supportsDeviceList: true,

  async requestPermissions() {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === "granted" &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === "granted"
    );
  },

  async isEnabled() {
    try {
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch {
      return false;
    }
  },

  async ensureEnabled() {
    try {
      if (await RNBluetoothClassic.isBluetoothEnabled()) return true;
      return await RNBluetoothClassic.requestBluetoothEnabled();
    } catch {
      return false;
    }
  },

  async startScan({ onDevice, onError, onComplete }: ScanHandlers) {
    scanActive = true;
    const seen = new Set<string>();

    const emit = (d: any, bonded: boolean) => {
      if (!d?.address || seen.has(d.address)) return;
      seen.add(d.address);
      const device: ScannedDevice = {
        id: d.id ?? d.address,
        address: d.address,
        name: d.name ?? "Bilinmeyen Cihaz",
        bonded,
        kind: "classic",
      };
      onDevice(device);
    };

    const finish = () => {
      if (!scanActive) return;
      scanActive = false;
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
      }
      onComplete?.();
    };

    try {
      try {
        await RNBluetoothClassic.cancelDiscovery();
      } catch {
        /* önceki tarama yoksa yoksay */
      }

      // 1) Eşleşmiş cihazları hemen göster
      const bonded = await RNBluetoothClassic.getBondedDevices();
      const bondedAddrs = new Set(bonded.map((b) => b.address));
      bonded.forEach((b) => emit(b, true));

      // 2) Yeni cihazları keşfet (güvenlik için zaman aşımı)
      scanTimeout = setTimeout(finish, SCAN_TIMEOUT_MS);
      const discovered = await RNBluetoothClassic.startDiscovery();
      discovered.forEach((d) => emit(d, bondedAddrs.has(d.address)));
      finish();
    } catch (error) {
      onError?.(error);
      finish();
    }
  },

  stopScan() {
    scanActive = false;
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
    RNBluetoothClassic.cancelDiscovery().catch(() => {});
  },

  async connect(device?: ScannedDevice) {
    if (!device?.address) {
      throw new Error("Bağlanmak için bir cihaz adresi gerekli.");
    }
    const connected = await RNBluetoothClassic.connectToDevice(
      device.address,
      CONNECTION_OPTIONS
    );
    return wrapConnectedDevice(connected);
  },

  onBluetoothDisabled(listener: () => void): Subscription {
    const sub = RNBluetoothClassic.onBluetoothDisabled(() => listener());
    return { remove: () => sub.remove() };
  },

  onDeviceDisconnected(listener: () => void): Subscription {
    const sub = RNBluetoothClassic.onDeviceDisconnected(() => listener());
    return { remove: () => sub.remove() };
  },
};

export default androidBackend;
