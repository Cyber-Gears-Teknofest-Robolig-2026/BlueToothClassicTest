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
import RNBluetoothClassic from "react-native-bluetooth-classic";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Buffer } from 'buffer';
import { KeyboardProvider, KeyboardAvoidingView, KeyboardStickyView } from 'react-native-keyboard-controller';

const SCREEN_HEIGHT = Dimensions.get("window").height;

// --- TİPLER ---
interface BluetoothDevice {
  address: string;
  name?: string;
  bonded: boolean;
}

interface Message {
  id: string;
  text: string;
  isSender: boolean;
  time: string;
}

// =====================================================================
// 1. ANA MENÜ EKRANI (HOME SCREEN)
// =====================================================================
const HomeScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={[styles.mainHeader, { paddingHorizontal: 25 }]}>
        <Text style={styles.mainHeaderText}>Hoş Geldiniz</Text>
        <Text style={styles.subHeaderText}>Lütfen bir işlem seçin</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity activeOpacity={0.8} style={styles.menuCard} onPress={() => onNavigate('Bluetooth')}>
          <View style={[styles.menuIconCircle, { backgroundColor: "#E0F2FE" }]}>
            <Icon name="bluetooth" size={30} color="#0284C7" />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>Bluetooth Bağlantısı</Text>
            <Text style={styles.menuDesc}>Cihazları tara, eşleş ve yönet</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} style={styles.menuCard} onPress={() => onNavigate('Communication')}>
          <View style={[styles.menuIconCircle, { backgroundColor: "#DCFCE7" }]}>
            <Icon name="swap-horizontal" size={30} color="#15803D" />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>Cihaz İletişimi</Text>
            <Text style={styles.menuDesc}>Bağlı cihaz ile veri alışverişi yap</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  const [currentScreen, setCurrentScreen] = useState<'Home' | 'Bluetooth' | 'Communication'>('Home');
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);

  useEffect(() => {
    const disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected((event) => {
      setConnectedDevice(null);
      Alert.alert("Bağlantı Koptu ⚠️", "Cihazın gücü kesildi veya menzilden çıkıldı.");
      setCurrentScreen('Home'); 
    });
    return () => disconnectSubscription.remove();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (currentScreen !== 'Home') {
        setCurrentScreen('Home');
        return true; 
      }
      return false; 
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentScreen]);

  if (currentScreen === 'Bluetooth') {
    return <BluetoothManager onGoBack={() => setCurrentScreen('Home')} connectedDevice={connectedDevice} setConnectedDevice={setConnectedDevice} />;
  }

  if (currentScreen === 'Communication') {
    return <CommunicationScreen onGoBack={() => setCurrentScreen('Home')} connectedDevice={connectedDevice} />;
  }

  return <HomeScreen onNavigate={(screen) => setCurrentScreen(screen as any)} />;
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

// =====================================================================
// TÜM STİLLER (TEMİZLENMİŞ)
// =====================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  mainHeader: { paddingTop: 20, paddingBottom: 10 },
  mainHeaderText: { fontSize: 28, fontWeight: "900", color: "#1E293B" },
  subHeaderText: { fontSize: 16, color: "#64748B", fontWeight: "500", marginTop: 4 },
  scrollContent: { paddingHorizontal: 25, paddingTop: 10, paddingBottom: 40, gap: 16 }, 
  
  headerWithBack: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  backBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  headerSpacer: { width: 40 },

  menuCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingVertical: 20, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: "#F1F5F9", elevation: 3 },
  menuIconCircle: { padding: 14, borderRadius: 18, marginRight: 16 },
  menuTextContent: { flex: 1 },
  menuTitle: { fontSize: 17, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  menuDesc: { fontSize: 13, color: "#64748B", fontWeight: "500" },

  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, gap: 15 },
  emptyTitle: { fontSize: 18, color: "#94A3B8" },

  // WhatsApp Chat Stilleri
  chatMainContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  chatHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 15, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  chatTitle: { fontSize: 17, fontWeight: "800", color: "#1E293B" },
  chatStatus: { fontSize: 12, color: "#10B981", fontWeight: "600" },
  
  chatContent: { paddingHorizontal: 15, paddingVertical: 20 },
  msgWrap: { flexDirection: "row", marginBottom: 8 },
  msgWrapMe: { justifyContent: "flex-end" },
  msgWrapYou: { justifyContent: "flex-start" },
  msgBubble: { maxWidth: "80%", padding: 10, borderRadius: 15, elevation: 1 },
  msgBubbleMe: { backgroundColor: "#DCF8C6", borderTopRightRadius: 2 },
  msgBubbleYou: { backgroundColor: "#F1F5F9", borderTopLeftRadius: 2 },
  msgText: { fontSize: 15, color: "#1E293B" },
  msgTextMe: { color: "#1E293B" },
  msgTextYou: { color: "#1E293B" },

  inputRowContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  inputBubble: { 
    flex: 1, 
    flexDirection: "row", 
    backgroundColor: "#F1F5F9", 
    borderRadius: 25, 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "transparent" 
  },
  inputBubbleFocused: { 
    borderColor: "#075E54", 
    backgroundColor: "#FFFFFF", 
    //elevation: 2 
  },
  textInput: { 
    flex: 1, 
    marginLeft: 10, 
    fontSize: 16, 
    color: "#1E293B", 
    paddingVertical: 0 
  },
  sendBtn: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: "center", 
    alignItems: "center", 
    elevation: 2 
  },

  // Bluetooth Durum Stilleri
  statusLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  label: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 1 },
  connectingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, gap: 2 },
  connectingText: { fontSize: 10, fontWeight: "900", color: "#F59E0B", textTransform: "uppercase" },
  smallSpinner: { transform: [{ scale: 0.6 }] },
  onlineBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  onlineText: { fontSize: 10, fontWeight: "900", color: "#10B981", textTransform: "uppercase" },
  offlineBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, gap: 4 },
  offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" },
  offlineText: { fontSize: 10, fontWeight: "900", color: "#EF4444", textTransform: "uppercase" },
  infoCard: { backgroundColor: "#fff", margin: 20, padding: 25, borderRadius: 28, elevation: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 25 },
  infoText: { fontSize: 18, fontWeight: "900", color: "#1E293B" },
  scanBtn: { backgroundColor: "#0984e3", padding: 18, borderRadius: 18, alignItems: "center" },
  scanBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  disconnectBtn: { marginTop: 12, padding: 16, borderRadius: 16, alignItems: "center", backgroundColor: "#F1F5F9" },
  disconnectBtnText: { color: "#EF4444", fontWeight: "800" },

  // Modal Stilleri
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#F8FAFC", borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden', position: 'absolute', width: '100%' },
  interactiveHeader: { width: '100%', paddingTop: 12, paddingBottom: 20 },
  dragHandle: { width: 45, height: 5, backgroundColor: "#CBD5E1", borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
  modalHeaderContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 25 },
  titleWrapper: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleIconCircle: { backgroundColor: "#E0F2FE", padding: 8, borderRadius: 12 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  closeCircle: { backgroundColor: "#E2E8F0", padding: 8, borderRadius: 20 },
  scanningIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#E0F2FE", marginHorizontal: 20, paddingVertical: 8, borderRadius: 12, marginBottom: 15, gap: 10, borderWidth: 1, borderColor: "#BAE6FD" },
  scanningIndicatorText: { fontSize: 13, color: "#0369A1", fontWeight: "700" },
  emptyStateText: { fontSize: 15, color: "#94A3B8", fontWeight: "600", textAlign: "center", marginTop: 50 },
  listContentStyle: { paddingBottom: 80, paddingHorizontal: 20 },
  separator: { height: 12 },
  deviceListItem: { flexDirection: "row", alignItems: "center", borderRadius: 24, padding: 16, borderWidth: 1 },
  listTextSection: { flex: 1, marginLeft: 15, gap: 2 },
  deviceName: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  deviceAddress: { fontSize: 12, color: "#64748B", fontFamily: "monospace" },
  badgeRow: { marginTop: 6, flexDirection: "row" },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  listIconCircle: { padding: 12, borderRadius: 16 },
  newCard: { backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" },
  pairedCard: { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" },
  connectedCard: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC", borderWidth: 1.5 },
  connectedIconCircle: { backgroundColor: "#10B981" },
  connectedBadge: { backgroundColor: "#DCFCE7" },
  connectedBadgeText: { color: "#15803D" },
  pairedBadge: { backgroundColor: "#E0F2FE" },
  pairedBadgeText: { color: "#0284C7" },
  newBadge: { backgroundColor: "#F1F5F9" },
  newBadgeText: { color: "#64748B" },
});