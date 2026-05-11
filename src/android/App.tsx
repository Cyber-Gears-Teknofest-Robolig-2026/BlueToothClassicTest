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
  //KeyboardAvoidingView,
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

const SCREEN_HEIGHT = Dimensions.get("window").height;

type RootStackParamList = {
  Home: undefined;
  Bluetooth: undefined;
  Communication: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

interface Message {
  id: string;
  text: string;
  isSender: boolean;
  time: string;
}

// =====================================================================
// 2. CİHAZ İLETİŞİM EKRANI (CHAT EKRANI - WHATSAPP STYLE)
// =====================================================================
const CommunicationScreen = ({ onGoBack, connectedDevice }: { onGoBack: () => void, connectedDevice: BluetoothDevice | null }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // VERİ OKUMA: Cihazdan gelen mesajları dinler
  useEffect(() => {
    if (!connectedDevice) return;
    
    const readSub = RNBluetoothClassic.onDeviceRead(connectedDevice.address, (event) => {
    // Bluetooth'tan gelen veri genellikle UTF-8 string olarak gelir.
    // Telefonun işletim sistemi (Android/iOS) bu string içindeki 
    // Unicode karakterlerini otomatik olarak emojiye dönüştürür.
    console.log("EVENT:", JSON.stringify(event));
    if (event.data) {
      console.log("DATA:", event.data);
      const receivedData = event.data.trim();

      const bytes = Buffer.from(event.data, "base64");

      console.log("Value:", bytes.toString("utf8"));
      
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: receivedData, // Emoji burada doğrudan string içinde yer alır
        isSender: false,
        time: new Date().toLocaleTimeString()
      }]);
    }
  });

    return () => readSub.remove();
  }, [connectedDevice]);

  // KLAVYE YÖNETİMİ: Geri tuşuyla kapanınca boşluğu sıfırlar
  useEffect(() => {
    const hideSub = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    );
    return () => hideSub.remove();
  }, []);

  /*useEffect(() => {
    const focused = inputRef.current?.isFocused();
    console.log("Input focus durumunda mı?", focused);
  }, [inputRef.current?.isFocused()]);*/


  // VERİ GÖNDERME: Bluetooth üzerinden yazar
  const sendMessage = async () => {
    if (!inputText.trim() || !connectedDevice) return;
    
    const msg = inputText.trim();
    setInputText(""); // Input'u hemen temizle (UX)

    try {
      // Bluetooth terminal standartı için mesaj sonuna \r\n ekliyoruz
      await RNBluetoothClassic.writeToDevice(connectedDevice.address, msg + "\r\n");
      
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: msg,
        isSender: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (e) {
      Alert.alert("Hata", "Veri gönderilemedi. Cihaz bağlı mı?");
    }
  };

  return (
    <SafeAreaView
      style={styles.chatMainContainer}
      edges={[
        "top",
        "left",
        "right",
        //...(!isFocused ? ["bottom" as const] : []),
        "bottom"
      ]}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>

        <View style={{ marginLeft: 12 }}>
          <Text style={styles.chatTitle}>
            {connectedDevice?.name || "Bağlı Değil"}
          </Text>
          <Text style={styles.chatStatus}>
            {connectedDevice ? "çevrimiçi" : "çevrimdışı"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          renderItem={({ item }) => (
            <View
              style={[
                styles.msgWrap,
                item.isSender ? styles.msgWrapMe : styles.msgWrapYou,
              ]}
            >
              <View
                style={[
                  styles.msgBubble,
                  item.isSender ? styles.msgBubbleMe : styles.msgBubbleYou,
                ]}
              >
                <Text style={styles.msgText}>{item.text}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <KeyboardStickyView 
          offset={{
            opened: insets.bottom,
            closed: 0,
          }}
        >
          <View
            style={[
              styles.inputRowContainer,
              {
                backgroundColor: "#FFFFFF",
              },
            ]}
          >
            <View style={[styles.inputBubble, isFocused && styles.inputBubbleFocused]}>
              <Icon
                name="emoticon-outline"
                size={24}
                color={isFocused ? "#075E54" : "#64748B"}
              />

              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Mesaj yazın..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                underlineColorAndroid="transparent"
                disableFullscreenUI={true}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    inputText.trim() && connectedDevice ? "#075E54" : "#94A3B8",
                },
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || !connectedDevice}
              activeOpacity={0.8}
            >
              <Icon name="send" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardStickyView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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