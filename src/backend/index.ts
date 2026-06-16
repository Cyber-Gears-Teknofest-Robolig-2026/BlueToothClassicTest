/**
 * BACKEND GİRİŞ NOKTASI
 * --------------------------------------------------------------------------
 * Sözleşme tiplerini tek noktadan dışa açar. Somut backend'ler (android / web)
 * platform çözümlemesini bozmamak için ilgili App dosyasında doğrudan import
 * edilir:
 *   - android:  src/backend/android  → androidBackend
 *   - web:      src/backend/web       → webBackend
 */
export type {
  BluetoothApi,
  ConnectedDevice,
  ScannedDevice,
  ScanHandlers,
  Subscription,
  DeviceKind,
} from "./types";
