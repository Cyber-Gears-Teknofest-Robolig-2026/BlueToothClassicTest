import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Animated,
  PanResponder,
  StatusBar,
  useWindowDimensions,
  ScrollView,
  BackHandler,
  Dimensions,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  InteractionManager,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import RNBluetoothClassic, { BluetoothDevice } from "react-native-bluetooth-classic";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Buffer } from 'buffer';
import { KeyboardProvider, KeyboardAvoidingView, KeyboardStickyView } from 'react-native-keyboard-controller';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import styles from './styles';
import HomeScreen from './HomeScreen/HomeScreen';
import BluetoothConnectionScreen from './BluetoothConnectionScreen/BluetoothConnectionScreen';
import CommunicationScreen from './CommunicationScreen/CommunicationScreen';

const SCREEN_HEIGHT = Dimensions.get("window").height;

type RootStackParamList = {
  Home: undefined;
  Bluetooth: undefined;
  Communication: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

// =====================================================================
// 4. ANA NAVİGASYON
// =====================================================================
const AppNavigator = () => {
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);

  useEffect(() => {
    const disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected(() => {
      setConnectedDevice(null);

      Alert.alert(
        "Bağlantı Koptu ⚠️",
        "Cihazın gücü kesildi veya menzilden çıkıldı."
      );

      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      }
    });

    return () => disconnectSubscription.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Home">
          {({ navigation }: NativeStackScreenProps<RootStackParamList, "Home">) => (
            <HomeScreen
              onNavigate={(screen) => {
                if (screen === "Bluetooth") {
                  navigation.navigate("Bluetooth");
                  return;
                }

                if (screen === "Communication") {
                  navigation.navigate("Communication");
                  return;
                }
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Bluetooth">
          {({ navigation }: NativeStackScreenProps<RootStackParamList, "Bluetooth">) => (
            <BluetoothConnectionScreen
              onGoBack={() => navigation.goBack()}
              connectedDevice={connectedDevice}
              setConnectedDevice={setConnectedDevice}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Communication">
          {({ navigation }: NativeStackScreenProps<RootStackParamList, "Communication">) => (
            <CommunicationScreen
              onGoBack={() => navigation.goBack()}
              connectedDevice={connectedDevice}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <KeyboardProvider
      statusBarTranslucent={false}
      navigationBarTranslucent={false}
    >
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}