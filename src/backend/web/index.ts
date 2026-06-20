/**
 * WEB BACKEND — Web Serial API
 * --------------------------------------------------------------------------
 * `BluetoothApi` sözleşmesinin tarayıcı `navigator.serial` ile uygulanması.
 * Web Serial'de uygulama içi cihaz listesi yoktur; `connect()` tarayıcının
 * yerel port seçici penceresini açar. Bu yüzden `supportsDeviceList = false`.
 */
import type {
  BluetoothApi,
  ConnectedDevice,
  ScanHandlers,
  ScannedDevice,
  Subscription,
} from "..";

const NOOP_SUBSCRIPTION: Subscription = { remove: () => {} };

const hasSerial = () =>
  typeof navigator !== "undefined" && "serial" in navigator;

/** Açık seri portu sözleşmedeki ConnectedDevice'e sarmalar. */
const wrapPort = (port: any): ConnectedDevice => {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let reading = false;
  // Okuma döngüsünün tamamlanmasını bekleyebilmek için promise'i saklarız.
  let readLoop: Promise<void> | null = null;

  /** Okuyucuyu iptal eder ve döngünün kilidi bırakmasını bekler. */
  const stopReading = async () => {
    reading = false;
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        /* yoksay */
      }
    }
    if (readLoop) {
      try {
        await readLoop;
      } catch {
        /* yoksay */
      }
      readLoop = null;
    }
  };

  return {
    id: "serial",
    address: "serial",
    name: "Seri Port",
    write: async (data: string) => {
      const writer = port.writable.getWriter();
      try {
        await writer.write(new TextEncoder().encode(data));
      } finally {
        writer.releaseLock();
      }
    },
    disconnect: async () => {
      // Önce okuma döngüsünü durdurup kilidi bırak, sonra portu kapat.
      await stopReading();
      await port.close();
    },
    onDataReceived: (listener) => {
      reading = true;
      const decoder = new TextDecoder();
      readLoop = (async () => {
        if (!port.readable) return;
        const localReader = port.readable.getReader();
        reader = localReader;
        try {
          while (reading) {
            const { value, done } = await localReader.read();
            if (done) break;
            if (value) {
              const text = decoder.decode(value).trim();
              if (text) listener({ data: text });
            }
          }
        } catch {
          /* okuma iptal edildi veya bağlantı koptu */
        } finally {
          // Kilidi bırak ki port.close() güvenle çağrılabilsin.
          localReader.releaseLock();
          reader = null;
        }
      })();

      return {
        remove: () => {
          void stopReading();
        },
      };
    },
  };
};

export const webBackend: BluetoothApi = {
  supportsDeviceList: false,

  async requestPermissions() {
    // Web Serial'de izinleri tarayıcı port seçicisi yönetir.
    return hasSerial();
  },

  async isEnabled() {
    return hasSerial();
  },

  async ensureEnabled() {
    return hasSerial();
  },

  async startScan({ onComplete }: ScanHandlers) {
    // Web Serial uygulama içi tarama desteklemez.
    onComplete?.();
  },

  stopScan() {},

  async connect(_device?: ScannedDevice) {
    if (!hasSerial()) {
      throw new Error(
        "Tarayıcınız Web Serial API desteklemiyor. Chrome veya Edge kullanın."
      );
    }
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    return wrapPort(port);
  },

  onBluetoothDisabled(_listener: () => void): Subscription {
    return NOOP_SUBSCRIPTION;
  },

  onDeviceDisconnected(_listener: () => void): Subscription {
    return NOOP_SUBSCRIPTION;
  },
};

export default webBackend;
