import React from "react";
import { Platform } from "react-native";
import WebApp from "@/src/frontend/web/App";
import AndroidApp from "@/src/frontend/android/App";
import { BluetoothProvider } from "@/src/frontend/android/BluetoothContext";
import type { BluetoothApi } from "@/src/backend";

/**
 * ENTEGRASYON KATMANI (frontend'in DIŞI)
 * --------------------------------------------------------------------------
 * Backend burada, frontend'in dışında, defansif şekilde yüklenir ve enjekte
 * edilir. Backend yüklenemezse (native modül yok / Expo Go / dosya silinmiş)
 * `null` döner; BluetoothProvider güvenli no-op'a düşer ve ARAYÜZ YİNE AÇILIR.
 */
function loadBackend(): BluetoothApi | null {
  try {
    if (Platform.OS === "web") {
      return require("./backend/web").default as BluetoothApi;
    }
    return require("./backend/android").default as BluetoothApi;
  } catch {
    return null;
  }
}

const backend = loadBackend();

export default function App() {
  const PlatformApp = Platform.OS === "web" ? WebApp : AndroidApp;
  return (
    <BluetoothProvider backend={backend}>
      <PlatformApp />
    </BluetoothProvider>
  );
}
