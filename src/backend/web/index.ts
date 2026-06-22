/**
 * WEB BACKEND — Web Serial API
 * --------------------------------------------------------------------------
 * `BluetoothApi` sözleşmesinin tarayıcı `navigator.serial` ile uygulanması.
 * Web Serial'de uygulama içi cihaz listesi yoktur; `connect()` tarayıcının
 * yerel port seçici penceresini açar. Bu yüzden `supportsDeviceList = false`.
 *
 * KAYNAK YÖNETİMİ: Aynı anda yalnızca tek bir aktif bağlantı olur. Bu yüzden
 * port/reader/okuma-döngüsü gibi kaynakları modül seviyesinde TEK yerde tutarız.
 * Böylece bağlantı; manuel kesme, fiziksel çıkarma (navigator "disconnect")
 * veya okuma akışının kopması — hangi yoldan sonlanırsa sonlansın aynı temizlik
 * mantığından geçer. Tam temizlik yapılmazsa COM portu "açık/meşgul" kalır ve
 * yalnızca sayfa yenilenince serbest bırakılır.
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

const OPEN_OPTIONS = { baudRate: 9600 } as const;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Bir promise'i süre sınırıyla bekler; ölü cihazda askıda kalmayı önler. */
const withTimeout = async (promise: Promise<unknown>, ms: number) => {
  await Promise.race([promise.catch(() => {}), delay(ms)]);
};

/* --------------------------------------------------------------------------
 * AKTİF BAĞLANTI DURUMU (tek seferde tek bağlantı)
 * ------------------------------------------------------------------------ */
const disconnectListeners = new Set<() => void>();
let activePort: any = null;
let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let activeReadLoop: Promise<void> | null = null;
// Okuma döngüsünün durdurma sinyali ARTIK aboneliğe özeldir (paylaşılan tek bir
// `reading` bayrağı değil). Böylece ekranlar arası geçişte hızlıca yeniden abone
// olununca eski döngü, yeni döngünün portunu yanlışlıkla kapatmaz.
let currentSub: { stopped: boolean } | null = null;
// Süren reader serbest bırakma işlemi. Yeni abonelik getReader()'dan ÖNCE bunu
// bekler; aksi halde stream hâlâ kilitliyken getReader() "already locked" atar.
let releasing: Promise<void> | null = null;
let serialDisconnectBound = false;

/** Portu sessizce kapatır (zaten kapalı/kopmuş olabilir; hatayı yoksay). */
const closeQuietly = async (port: any) => {
  try {
    await port.close();
  } catch {
    /* zaten kapalı veya cihaz koptu */
  }
};

/**
 * Okuma döngüsünü durdurur ve kilidi bırakır. read() ölü cihazda askıda
 * kalabileceği için iptal ve döngü beklemeleri süre sınırlıdır.
 */
const releaseReader = async () => {
  if (currentSub) currentSub.stopped = true;
  const reader = activeReader;
  const loop = activeReadLoop;
  // Serbest bırakmayı tek bir promise'te topla ki yeni abonelik bunu bekleyebilsin.
  releasing = (async () => {
    if (reader) {
      await withTimeout(Promise.resolve(reader.cancel()), 1500);
    }
    if (loop) {
      await withTimeout(loop, 1500);
    }
    // Yalnızca hâlâ aynı reader/loop ise temizle; yeni abonelik atadıysa dokunma.
    if (activeReader === reader) activeReader = null;
    if (activeReadLoop === loop) activeReadLoop = null;
  })();
  await releasing;
};

/** Aktif portu tamamen kapatır: okumayı durdur, kilidi bırak, portu kapat. */
const teardown = async (port: any) => {
  await releaseReader();
  await closeQuietly(port);
};

const fireDisconnectListeners = () => {
  disconnectListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* dinleyici hatasını yoksay */
    }
  });
};

/**
 * Beklenmedik okuma sonu (read() hata verdi / done döndü) yolundan çağrılır.
 * Bu kod okuma döngüsünün İÇİNDEN çalışır; releaseReader (activeReadLoop'u
 * beklediğinden) deadlock olurdu. Döngü zaten bitti ve kilidi finally'de
 * bıraktı, bu yüzden doğrudan portu kapatırız.
 */
const handleReadLoopEnded = async (port: any) => {
  if (activePort !== port) return; // başka bir yol zaten ele aldı
  activePort = null;
  activeReader = null;
  activeReadLoop = null;
  if (currentSub) currentSub.stopped = true;
  await closeQuietly(port);
  fireDisconnectListeners();
};

/** Fiziksel çıkarma / harici kopma: tam temizlik yapıp dinleyicileri uyar. */
const handlePortRemoved = async (port: any) => {
  if (!port || activePort !== port) return; // başka bir yol zaten ele aldı
  activePort = null;
  await teardown(port);
  fireDisconnectListeners();
};

/** navigator.serial'in fiziksel "disconnect" olayını bir kez bağlar. */
const bindSerialDisconnect = () => {
  if (serialDisconnectBound || !hasSerial()) return;
  serialDisconnectBound = true;
  (navigator as any).serial.addEventListener("disconnect", (event: any) => {
    // Bazı tarayıcılarda event.target = navigator.serial olabilir (port değil).
    // Tek aktif portumuz olduğundan, eşleşmese bile activePort'u kapatırız.
    const evPort = event?.target ?? event?.port;
    void handlePortRemoved(evPort === activePort ? evPort : activePort);
  });
};

/**
 * Portu açar; ilk denemede başarısız olursa (önceki kopmadan "açık" kalmış
 * olabilir ya da işletim sistemi COM portunu henüz serbest bırakmamış olabilir)
 * kapatıp kısa aralıklarla birkaç kez yeniden dener. Hepsi başarısız olursa
 * son hatayı yukarı fırlatır.
 */
const openPort = async (port: any) => {
  try {
    await port.open(OPEN_OPTIONS);
    return;
  } catch {
    await closeQuietly(port);
  }
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    await delay(300);
    try {
      await port.open(OPEN_OPTIONS);
      return;
    } catch (error) {
      lastError = error;
      await closeQuietly(port);
    }
  }
  throw lastError;
};

/** Açık seri portu sözleşmedeki ConnectedDevice'e sarmalar. */
const wrapPort = (port: any): ConnectedDevice => ({
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
    // Manuel kesme: kopma bildirimi tetiklenmesin diye aktif izi temizle.
    if (activePort === port) activePort = null;
    await teardown(port);
  },
  onDataReceived: (listener) => {
    const decoder = new TextDecoder();
    // Bu aboneliğe özel durdurma bayrağı.
    const sub = { stopped: false };
    currentSub = sub;
    // Önceki aboneliğin reader'ı hâlâ serbest bırakılıyor olabilir; o promise'i yakala.
    const previousRelease = releasing;

    const loop = (async () => {
      // Eski reader serbest bırakılana kadar bekle, yoksa stream "already locked" atar.
      if (previousRelease) {
        try {
          await previousRelease;
        } catch {
          /* yoksay */
        }
      }
      if (sub.stopped || !port.readable) return;

      // Stream hâlâ kilitliyse (serbest bırakma yarışı) kısa aralıklarla yeniden dene.
      let localReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
      for (let attempt = 0; attempt < 6 && !sub.stopped; attempt++) {
        try {
          localReader = port.readable.getReader();
          break;
        } catch {
          await delay(60);
        }
      }
      if (!localReader || sub.stopped) {
        try {
          localReader?.releaseLock();
        } catch {
          /* yoksay */
        }
        return;
      }
      activeReader = localReader;

      try {
        while (!sub.stopped) {
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
        // Akışı iptal et + kilidi bırak ki port.close() güvenle çalışsın.
        try {
          localReader.releaseLock();
        } catch {
          /* zaten bırakılmış olabilir */
        }
        if (activeReader === localReader) activeReader = null;
      }
      // Döngü manuel durdurma OLMADAN sona erdiyse cihaz koptu/yanıt vermiyor
      // demektir → portu kapatıp kopmayı bildir.
      if (!sub.stopped) await handleReadLoopEnded(port);
    })();
    activeReadLoop = loop;

    return {
      // Aboneliği kaldır: yalnızca okumayı durdur (portu KAPATMA; ekranlar
      // arası geçişte bağlantı korunur, yeniden onDataReceived ile devam eder).
      remove: () => {
        sub.stopped = true;
        void releaseReader();
      },
    };
  },
});

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
    // Savunma: önceki bir bağlantı tam temizlenmeden kaldıysa, yeni porta
    // geçmeden önce kapat (aksi halde COM portu meşgul kalabilir).
    if (activePort) {
      const previous = activePort;
      activePort = null;
      await teardown(previous);
    }
    const port = await (navigator as any).serial.requestPort();
    await openPort(port);
    // Kopma takibi: aktif portu kaydet ve fiziksel çıkarma olayını bağla.
    activePort = port;
    bindSerialDisconnect();
    return wrapPort(port);
  },

  onBluetoothDisabled(_listener: () => void): Subscription {
    return NOOP_SUBSCRIPTION;
  },

  onDeviceDisconnected(listener: () => void): Subscription {
    bindSerialDisconnect();
    disconnectListeners.add(listener);
    return { remove: () => disconnectListeners.delete(listener) };
  },
};

export default webBackend;
