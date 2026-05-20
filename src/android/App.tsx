import React, { useEffect, useState, useRef } from "react";
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
import { 
  RootStackParamList,
  AppNavigationProp, 
  useBluetoothStore, 
} from "./constants";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const manuallyDisconnected = useBluetoothStore((state) => state.manuallyDisconnected);
  const setManuallyDisconnected = useBluetoothStore((state) => state.setManuallyDisconnected);
  const showBluetoothAlert = useRef(false);

  useEffect(() => {
    const bluetoothDisabledSubscription = RNBluetoothClassic.onBluetoothDisabled(async () => {
      Alert.alert(
        "Hata",
        "Bluetooth kapalı!"
      );
      showBluetoothAlert.current = true;
      await connectedDevice?.disconnect();
      setManuallyDisconnected(false);
      setConnectedDevice(null);
    });
    return () => {
      bluetoothDisabledSubscription.remove();
    };
  }, []);

  /*useEffect(() => {
    const bluetoothCheckInterval = setInterval(async () => {
      try {
        const enabled = await RNBluetoothClassic.isBluetoothEnabled();

        // setIsBluetoothEnabled(enabled);

        if (!enabled) {
          if (!showBluetoothAlert.current) {
            console.log("Bluetooth tamamen kapatıldı");
            Alert.alert(
              "Hata",
              "Bluetooth kapalı!"
            );
            showBluetoothAlert.current = true;
          }

          // connectedDeviceRef.current = null;
          setConnectedDevice(null);
          // setIsConnected(false);
          setManuallyDisconnected(false);
        }
        else {
          showBluetoothAlert.current = false;
        }
      } catch (error) {
        console.log("Bluetooth kontrol hatası:", error);
      }
    }, 1000);

    return () => {
      //disconnectedSubscription.remove();
      clearInterval(bluetoothCheckInterval);
    };
  }, []);*/

  useEffect(() => {
    const disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected(() => {
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