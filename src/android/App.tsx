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
// 3. BLUETOOTH YÖNETİM EKRANI
// =====================================================================
interface BluetoothManagerProps {
  onGoBack: () => void;
  connectedDevice: BluetoothDevice | null;
  setConnectedDevice: (device: BluetoothDevice | null) => void;
}

const BluetoothManager = ({ onGoBack, connectedDevice, setConnectedDevice }: BluetoothManagerProps) => {
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = useWindowDimensions();
  const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;

  const SNAP_FULL = 0;
  const SNAP_PARTIAL = SCREEN_HEIGHT * 0.35; 
  const SNAP_CLOSED = SCREEN_HEIGHT;

  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const panY = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const currentSnapPoint = useRef(SNAP_CLOSED);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const nextValue = currentSnapPoint.current + gestureState.dy;
        if (nextValue >= -20) panY.setValue(nextValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const movedY = currentSnapPoint.current + gestureState.dy;
        const velocity = gestureState.vy;

        if (velocity > 0.5 || movedY > SNAP_PARTIAL + 150) closeModal();
        else if (velocity < -0.5 || movedY < SNAP_PARTIAL / 2) animateToPoint(SNAP_FULL);
        else animateToPoint(SNAP_PARTIAL);
      }
    })
  ).current;

  const animateToPoint = (point: number) => {
    Animated.spring(panY, {
      toValue: point,
      useNativeDriver: true,
      tension: 50,
      friction: 10
    }).start(() => currentSnapPoint.current = point);
  };

  const openBluetoothModal = async () => {
    setModalVisible(true);
    animateToPoint(isLandscape ? SNAP_FULL : SNAP_PARTIAL);
    setScanning(true);
    try {
      if (Platform.OS === "android") {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
      }
      const bonded = await RNBluetoothClassic.getBondedDevices();
      setDevices(bonded.map((d: any) => ({ ...d, bonded: true })));

      setTimeout(async () => {
        try {
          await RNBluetoothClassic.cancelDiscovery();
          const discovered = await RNBluetoothClassic.startDiscovery();
          const map = new Map();
          [...bonded, ...discovered].forEach(d => map.set(d.address, { 
            ...d, bonded: bonded.some(b => b.address === d.address) 
          }));
          setDevices(Array.from(map.values()));
        } catch (e) {} finally { setScanning(false); }
      }, 500);
    } catch (err) { setScanning(false); }
  };

  const closeModal = () => {
    Animated.timing(panY, {
      toValue: SNAP_CLOSED,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setModalVisible(false);
      currentSnapPoint.current = SNAP_CLOSED;
    });
    try { RNBluetoothClassic.cancelDiscovery(); } catch (e) {}
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      closeModal();
      setIsConnecting(true);
      const connected = await RNBluetoothClassic.connectToDevice(device.address, {
        connectorType: "rfcomm",
        CONNECTION_TYPE: "binary",
        delimiter: "\n",     // Satır sonu karakterini bekle (En önemli kısım)
        encoding: "utf-8",   // UTF-8 formatında çöz
      });
      setConnectedDevice(connected as any);
      setIsConnecting(false);
    } catch (e) { setIsConnecting(false); Alert.alert("Hata", "Bağlantı kurulamadı."); }
  };

  const disconnectDevice = async () => {
    try { if (connectedDevice) { await RNBluetoothClassic.disconnectFromDevice(connectedDevice.address); setConnectedDevice(null); } } catch (err) {}
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => {
    const isConnected = connectedDevice?.address === item.address;
    const isPaired = item.bonded;
    const cardStyle = isConnected ? styles.connectedCard : isPaired ? styles.pairedCard : styles.newCard;
    const iconColor = isConnected ? "#fff" : isPaired ? "#0284C7" : "#64748B";

    return (
      <TouchableOpacity activeOpacity={0.7} style={[styles.deviceListItem, cardStyle]} onPress={() => isConnected ? disconnectDevice() : connectToDevice(item)}>
        <View style={[styles.listIconCircle, isConnected && styles.connectedIconCircle]}>
          <Icon name={isConnected ? "bluetooth-connect" : "bluetooth"} size={22} color={iconColor} />
        </View>
        <View style={styles.listTextSection}>
          <Text style={styles.deviceName} numberOfLines={1}>{item.name || "Bilinmeyen Cihaz"}</Text>
          <Text style={styles.deviceAddress}>{item.address}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, isConnected ? styles.connectedBadge : isPaired ? styles.pairedBadge : styles.newBadge]}>
               <Text style={[styles.statusBadgeText, isConnected ? styles.connectedBadgeText : isPaired ? styles.pairedBadgeText : styles.newBadgeText]}>
                 {isConnected ? "BAĞLI" : isPaired ? "EŞLEŞMİŞ" : "YENİ CİHAZ"}
               </Text>
            </View>
          </View>
        </View>
        <Icon name={isConnected ? "link-off" : "chevron-right"} size={24} color={isConnected ? "#EF4444" : isPaired ? "#7DD3FC" : "#CBD5E1"} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bluetooth Yönetimi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingLeft: insets.left, paddingRight: insets.right }}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="bluetooth" size={32} color={isConnecting ? "#F59E0B" : connectedDevice ? "#10B981" : "#EF4444"} />
            <View style={{ flex: 1 }}>
              <View style={styles.statusLabelRow}>
                <Text style={styles.label}>BAĞLANTI DURUMU</Text>
                {isConnecting ? (
                  <View style={styles.connectingBadge}>
                    <ActivityIndicator size="small" color="#F59E0B" style={styles.smallSpinner} />
                    <Text style={styles.connectingText}>Bağlanıyor...</Text>
                  </View>
                ) : connectedDevice ? (
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Bağlandı</Text>
                  </View>
                ) : (
                  <View style={styles.offlineBadge}>
                    <View style={styles.offlineDot} />
                    <Text style={styles.offlineText}>Bağlı Değil</Text>
                  </View>
                )}
              </View>
              <Text style={styles.infoText}>{isConnecting ? "Lütfen bekleyin..." : connectedDevice ? connectedDevice.name : "Cihaz seçilmedi"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={openBluetoothModal} disabled={isConnecting}>
            <Text style={styles.scanBtnText}>Cihaz Ara ve Bağlan</Text>
          </TouchableOpacity>
          {connectedDevice && !isConnecting && (
            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectDevice}>
              <Text style={styles.disconnectBtnText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBox, { height: SCREEN_HEIGHT, transform: [{ translateY: panY }] }]}>
            <View style={{ flex: 1, paddingLeft: insets.left, paddingRight: insets.right }}>
              <View {...panResponder.panHandlers} style={styles.interactiveHeader}>
                <View style={styles.dragHandle} />
                <View style={styles.modalHeaderContent}>
                  <View style={styles.titleWrapper}>
                    <View style={styles.titleIconCircle}>
                      <Icon name="bluetooth" size={20} color="#0984e3" />
                    </View>
                    <Text style={styles.modalTitle}>Bluetooth Cihazları</Text>
                  </View>
                  <TouchableOpacity onPress={closeModal} style={styles.closeCircle}>
                    <Icon name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {scanning && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="small" color="#0984e3" />
                  <Text style={styles.scanningIndicatorText}>Yakındaki cihazlar taranıyor...</Text>
                </View>
              )}

              <FlatList
                data={devices}
                keyExtractor={(item) => item.address}
                renderItem={renderDevice}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContentStyle}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={!scanning ? <Text style={styles.emptyStateText}>Cihaz bulunamadı</Text> : null}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
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
            <BluetoothManager
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