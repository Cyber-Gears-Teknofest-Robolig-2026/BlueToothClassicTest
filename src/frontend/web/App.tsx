import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./HomeScreen";
import BluetoothConnectionScreen from "./BluetoothConnectionScreen";
import CommunicationScreen from "./CommunicationScreen";
import { type RootStackParamList } from "./constants";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer
      documentTitle={{
        formatter: (_, route) => {
          const titles: Record<string, string> = {
            Home: "Ana Sayfa",
            BluetoothConnection: "Bluetooth Yönetimi",
            Communication: "İletişim",
          };
          return titles[route?.name ?? ""] ?? "Bluetooth Test";
        },
      }}
      linking={{
        prefixes: [],
        config: {
          screens: {
            Home: "",
            BluetoothConnection: "BluetoothConnection",
            Communication: "Communication",
          },
        },
      }}
    >
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
export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
