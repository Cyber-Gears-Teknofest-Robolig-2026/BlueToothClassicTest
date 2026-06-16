/**
 * FRONTEND ↔ BACKEND DİKİŞİ (SEAM)
 * --------------------------------------------------------------------------
 * Bütün arayüz, Bluetooth motoruna SADECE bu context üzerinden erişir:
 *
 *   const bt = useBluetooth();
 *   await bt.requestPermissions();
 *   await bt.connect(device);
 *
 * Ekranlar `react-native-bluetooth-classic` / `navigator.serial` gibi hiçbir
 * native API'yi doğrudan import etmez. Backend, App kök bileşeninde enjekte edilir:
 *
 *   <BluetoothProvider backend={androidBackend}>...</BluetoothProvider>
 *
 * TAŞINABİLİRLİK: Bu `frontend/` klasörünü başka bir projeye kopyala, kendi
 * `BluetoothApi` uygulamanı yaz ve provider'a ver — ekranlar değişmeden çalışır.
 */
import React, { createContext, useContext } from "react";
import type { BluetoothApi } from "../../backend/types";

const BluetoothContext = createContext<BluetoothApi | null>(null);

type BluetoothProviderProps = {
  /** Enjekte edilen Bluetooth motoru (android / web / özel). */
  backend: BluetoothApi;
  children: React.ReactNode;
};

export function BluetoothProvider({ backend, children }: BluetoothProviderProps) {
  return (
    <BluetoothContext.Provider value={backend}>
      {children}
    </BluetoothContext.Provider>
  );
}

/** Enjekte edilen Bluetooth motorunu döndürür. Provider dışında çağrılırsa hata verir. */
export function useBluetooth(): BluetoothApi {
  const ctx = useContext(BluetoothContext);
  if (!ctx) {
    throw new Error(
      "useBluetooth, <BluetoothProvider> içinde kullanılmalıdır."
    );
  }
  return ctx;
}

// Sözleşme tiplerini tek import noktasından erişilebilir kıl (kolaylık için).
export type {
  BluetoothApi,
  ConnectedDevice,
  ScannedDevice,
  ScanHandlers,
  Subscription,
} from "../../backend/types";
