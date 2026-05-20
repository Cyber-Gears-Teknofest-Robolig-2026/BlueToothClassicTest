import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import HomeScreen from './HomeScreen';
import SerialConnectionScreen from './SerialConnectionScreen';
import CommunicationScreen from './CommunicationScreen';
import { type RootStackParamList, useSerialStore } from './constants';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const connectedPort = useSerialStore((state) => state.connectedPort);
  const setConnectedPort = useSerialStore((state) => state.setConnectedPort);
  const manuallyDisconnected = useSerialStore(
    (state) => state.manuallyDisconnected
  );
  const setManuallyDisconnected = useSerialStore(
    (state) => state.setManuallyDisconnected
  );

  useEffect(() => {
    // Bağlantı kopma kontrolü (Web Serial API için basit implementasyon)
    const checkConnection = setInterval(() => {
      if (connectedPort && !manuallyDisconnected) {
        // Web Serial API'de bağlantı durumu kontrolü
        // Gerçek implementasyon daha karmaşık olabilir
      }
    }, 5000);

    return () => clearInterval(checkConnection);
  }, [connectedPort, manuallyDisconnected]);

  return (
    <NavigationContainer
      linking={{
        prefixes: [],
        config: {
          screens: {
            SerialConnection: '/SerialConnection',
            Communication: '/Communication',
          },
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home">
          {() => <HomeScreen />}
        </Stack.Screen>

        <Stack.Screen name="SerialConnection">
          {() => <SerialConnectionScreen />}
        </Stack.Screen>

        <Stack.Screen name="Communication">
          {() => <CommunicationScreen />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
