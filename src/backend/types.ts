/**
 * BACKEND ↔ FRONTEND SÖZLEŞMESİ (CONTRACT)
 * --------------------------------------------------------------------------
 * Bu dosya, arayüzün (frontend) Bluetooth motorundan (backend) beklediği TEK
 * sözleşmedir. Frontend yalnızca bu tipleri ve `useBluetooth()` hook'unu bilir;
 * `react-native-bluetooth-classic`, `react-native-ble-plx` veya `navigator.serial`
 * gibi platforma özgü hiçbir şeyi doğrudan tanımaz.
 *
 * Başka bir projeye taşırken: frontend/ klasörünü ve bu dosyayı kopyala, ardından
 * `BluetoothApi`'yi kendi backend'inle uygula ve `<BluetoothProvider backend={...}>`
 * ile enjekte et. Arayüz hiç değişmeden çalışır.
 */

/** Abonelik tutamacı; dinleyici eklendiğinde geri döner, `remove()` ile temizlenir. */
export type Subscription = { remove: () => void };

/** Cihaz hangi alt teknolojiyle bulundu? */
export type DeviceKind = "classic" | "serial";

/** Tarama sırasında listelenen, henüz bağlanılmamış cihaz. */
export type ScannedDevice = {
  id: string;
  /** Ekranlarda anahtar olarak kullanılan benzersiz adres. */
  address: string;
  name: string;
  /** Daha önce eşleşmiş (bonded) klasik cihaz mı? */
  bonded?: boolean;
  kind?: DeviceKind;
};

/**
 * Aktif bağlantı. Frontend bu nesne üzerinden mesaj yazar/dinler.
 * Önemli: `onDataReceived` her platformda ÇÖZÜLMÜŞ (decoded) UTF-8 metin yollar;
 * frontend tarafında base64 / TextDecoder çözümlemesi GEREKMEZ.
 */
export type ConnectedDevice = {
  id: string;
  address: string;
  name: string;
  /** Düz metni cihaza yazar. Encoding (utf-8 / base64) backend'in sorumluluğudur. */
  write: (data: string) => Promise<void>;
  disconnect: () => Promise<void>;
  /** Gelen veriyi çözülmüş metin olarak (`event.data`) iletir. */
  onDataReceived: (
    listener: (event: { data: string }) => void
  ) => Subscription;
};

/** Tarama sırasında geri çağrılar. */
export type ScanHandlers = {
  /** Yeni bir cihaz bulunduğunda (yinelemeler backend tarafından elenir) çağrılır. */
  onDevice: (device: ScannedDevice) => void;
  onError?: (error: unknown) => void;
  /** Tarama (zaman aşımı veya `stopScan`) bittiğinde çağrılır. */
  onComplete?: () => void;
};

/**
 * Frontend'in bağımlı olduğu Bluetooth motoru arayüzü.
 * Her platform (android / web) bunu kendi yöntemiyle uygular.
 */
export interface BluetoothApi {
  /** Bu backend cihaz tarayıp liste sunuyor mu? (android: true, web serial: false) */
  readonly supportsDeviceList: boolean;

  /** Gerekli izinleri ister (android runtime izinleri; web'de no-op true). */
  requestPermissions(): Promise<boolean>;

  /** Bluetooth/Serial donanımı kullanılabilir ve açık mı? */
  isEnabled(): Promise<boolean>;

  /** Kapalıysa açmayı dener; açık/açıldıysa true döner. */
  ensureEnabled(): Promise<boolean>;

  /** İlerlemeli tarama başlatır (yalnızca supportsDeviceList=true backend'lerde anlamlı). */
  startScan(handlers: ScanHandlers): Promise<void>;

  /** Taramayı durdurur. */
  stopScan(): void;

  /**
   * Bağlanır. android'de seçilen `device` verilir; web serial'de `device`
   * verilmez ve tarayıcının yerel port seçici penceresi açılır.
   */
  connect(device?: ScannedDevice): Promise<ConnectedDevice>;

  /** Bluetooth donanımı kapatıldığında tetiklenir (web'de no-op). */
  onBluetoothDisabled(listener: () => void): Subscription;

  /** Aktif cihazla bağlantı koptuğunda tetiklenir (web'de no-op). */
  onDeviceDisconnected(listener: () => void): Subscription;
}
