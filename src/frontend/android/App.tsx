import React, { useEffect } from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./HomeScreen";
import BluetoothConnectionScreen from "./BluetoothConnectionScreen";
import CommunicationScreen from "./CommunicationScreen";
import { RootStackParamList, useBluetoothStore } from "./constants";
import { useBluetooth } from "./BluetoothContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const bt = useBluetooth();
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );

  // Bluetooth donanımı kapatıldığında bağlantıyı temizle.
  useEffect(() => {
    const sub = bt.onBluetoothDisabled(async () => {
      Alert.alert("Hata", "Bluetooth kapalı!");
      const { connectedDevice } = useBluetoothStore.getState();
      await connectedDevice?.disconnect().catch(() => {});
      setManuallyDisconnected(false);
      setConnectedDevice(null);
    });
    return () => sub.remove();
  }, [bt]);

  // Cihazla bağlantı koptuğunda (güç kesilmesi / menzil dışı) kullanıcıyı uyar.
  useEffect(() => {
    const sub = bt.onDeviceDisconnected(() => {
      setConnectedDevice(null);
      const { manuallyDisconnected } = useBluetoothStore.getState();
      if (!manuallyDisconnected) {
        Alert.alert(
          "Bağlantı Koptu ⚠️",
          "Cihazın gücü kesildi veya menzilden çıkıldı."
        );
      }
      setManuallyDisconnected(false);
    });
    return () => sub.remove();
  }, [bt]);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home">{() => <HomeScreen />}</Stack.Screen>
        <Stack.Screen name="BluetoothConnection">
          {() => <BluetoothConnectionScreen />}
        </Stack.Screen>
        <Stack.Screen name="Communication">
          {() => <CommunicationScreen />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Backend, frontend DIŞINDA (src/App.tsx) <BluetoothProvider> ile enjekte edilir.
// Burada provider yoktur; bu sayede frontend/ klasörü backend'e bağımlı değildir.
export default function App() {
  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
