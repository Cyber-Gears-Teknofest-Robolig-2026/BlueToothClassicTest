import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";

// Nordic UART Service (NUS) UUIDs (same as in source project)
export const NUS_SERVICE = "8c17a100-2b31-4f52-9a68-7b126a090001";
export const NUS_RX = "8c17a100-2b31-4f52-9a68-7b126a090002"; // write (client -> device)
export const NUS_TX = "8c17a100-2b31-4f52-9a68-7b126a090003"; // notify (device -> client)

export const bleManager = new BleManager();

export type BluetoothDevice = {
  id: string;
  address: string;
  name: string;
  write: (data: string) => Promise<void>;
  disconnect: () => Promise<void>;
  onDataReceived: (
    listener: (event: { data: string }) => void
  ) => { remove: () => void };
};

export const stopBleScan = () => {
  try { bleManager.stopDeviceScan(); } catch (e) {}
};

export const ensureBluetoothOn = async (): Promise<boolean> => {
  try {
    // bleManager.state may be synchronous or async depending on implementation
    // treat as async
    const state: any = await (bleManager as any).state?.();
    if (state === "PoweredOn") return true;
    if ((bleManager as any).enable) {
      await (bleManager as any).enable();
      return true;
    }
  } catch (e) {}
  return false;
};
const wrapNusDevice = (device: Device): BluetoothDevice => ({
  id: device.id,
  address: device.id,
  name: device.name ?? device.localName ?? "Bilinmeyen Cihaz",
  write: async (data: string) => {
    const base64 = Buffer.from(data, "utf-8").toString("base64");
    await device.writeCharacteristicWithResponseForService(
      NUS_SERVICE,
      NUS_RX,
      base64
    );
  },
  onDataReceived: (listener) => {
    const subscription = device.monitorCharacteristicForService(
      NUS_SERVICE,
      NUS_TX,
      (error: any, characteristic: any) => {
        if (error || !characteristic?.value) return;
        listener({ data: characteristic.value });
      }
    );
    return { remove: () => subscription.remove() };
  },
  disconnect: async () => {
    await bleManager.cancelDeviceConnection(device.id);
  },
});

export const connectToNusDevice = async (
  deviceId: string
): Promise<BluetoothDevice> => {
  const device = await bleManager.connectToDevice(deviceId, { requestMTU: 247 });
  await device.discoverAllServicesAndCharacteristics();
  return wrapNusDevice(device);
};

export const startBleScan = async (scanDurationMs = 4000): Promise<BluetoothDevice[]> => {
  return new Promise((resolve) => {
    const seen = new Map<string, BluetoothDevice>();

    bleManager.startDeviceScan(null, null, (error: any, device: any) => {
      if (error) return; // ignore errors for now
      if (!device || !device.id) return;
      if (!seen.has(device.id)) {
        seen.set(device.id, wrapNusDevice(device));
      }
    });

    setTimeout(() => {
      try {
        bleManager.stopDeviceScan();
      } catch (e) {}
      resolve(Array.from(seen.values()));
    }, scanDurationMs);
  });
};
