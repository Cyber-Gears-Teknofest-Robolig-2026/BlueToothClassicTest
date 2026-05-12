import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import RNBluetoothClassic, {
  BluetoothDevice,
} from "react-native-bluetooth-classic";
import {
  NavigationContainer,
  useNavigation,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { create } from "zustand";
import HomeScreen from "./HomeScreen";
import BluetoothConnectionScreen from "./BluetoothConnectionScreen";
import CommunicationScreen from "./CommunicationScreen";

type BluetoothStore = {
  connectedDevice: BluetoothDevice | null;
  setConnectedDevice: (device: BluetoothDevice | null) => void;
};

export const useBluetoothStore = create<BluetoothStore>((set) => ({
  connectedDevice: null,
  setConnectedDevice: (device) => set({ connectedDevice: device }),
}));

export type RootStackParamList = {
  Home: undefined;
  BluetoothConnection: undefined;
  Communication: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);

  useEffect(() => {
    const disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected(() => {
      setConnectedDevice(null);
      Alert.alert(
        "Bağlantı Koptu ⚠️",
        "Cihazın gücü kesildi veya menzilden çıkıldı."
      );
    });
    return () => disconnectSubscription.remove();
  }, []);

  return (
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home">
            {() => (
              <HomeScreen />
            )}
          </Stack.Screen>

          <Stack.Screen name="BluetoothConnection">
            {() => (
              <BluetoothConnectionScreen />
            )}
          </Stack.Screen>

          <Stack.Screen name="Communication">
            {() => (
              <CommunicationScreen />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
  );
};

export default function App() {
  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}