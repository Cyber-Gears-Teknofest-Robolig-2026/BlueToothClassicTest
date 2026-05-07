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
  Dimensions
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface BluetoothDevice {
  address: string;
  name?: string;
  bonded: boolean;
}

const HomeScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={[styles.mainHeader, { paddingHorizontal: 25 }]}>
        <Text style={styles.mainHeaderText}>Hoş Geldiniz</Text>
        <Text style={styles.subHeaderText}>Lütfen bir işlem seçin</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          style={styles.menuCard}
          onPress={() => onNavigate('Bluetooth')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: "#E0F2FE" }]}>
            <Icon name="bluetooth" size={32} color="#0284C7" />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>Bluetooth Bağlantısı</Text>
            <Text style={styles.menuDesc}>Cihazları tara, eşleş ve yönet</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.8} 
          style={styles.menuCard}
          onPress={() => onNavigate('Communication')}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: "#DCFCE7" }]}>
            <Icon name="swap-horizontal" size={32} color="#15803D" />
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

const CommunicationScreen = ({ onGoBack }: { onGoBack: () => void }) => {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cihaz İletişimi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.centerContent}>
        <Icon name="hammer-wrench" size={60} color="#94A3B8" />
        <Text style={styles.wipTitle}>Yapım Aşamasında</Text>
        <Text style={styles.wipDesc}>
          HC-05 ve diğer cihazlarla veri alışverişi yapacağın arayüz buraya gelecek.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const BluetoothManager = ({ onGoBack }: { onGoBack: () => void }) => {
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = useWindowDimensions();
  const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;

  const SNAP_FULL = 0;
  const SNAP_PARTIAL = SCREEN_HEIGHT * 0.35; 
  const SNAP_CLOSED = SCREEN_HEIGHT;

  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const panY = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const currentSnapPoint = useRef(SNAP_CLOSED);

  useEffect(() => {
    const disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected((event) => {
      setConnectedDevice(null);
      setIsConnecting(false); 
      Alert.alert("Bağlantı Koptu ⚠️", "Cihazın gücü kesildi veya menzilden çıkıldı.");
    });
    return () => disconnectSubscription.remove();
  }, []);

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
      const connected = await RNBluetoothClassic.connectToDevice(device.address);
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

const AppNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState<'Home' | 'Bluetooth' | 'Communication'>('Home');

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

  const navigateTo = (screen: 'Home' | 'Bluetooth' | 'Communication') => {
    setCurrentScreen(screen);
  };

  if (currentScreen === 'Bluetooth') {
    return <BluetoothManager onGoBack={() => navigateTo('Home')} />;
  }

  if (currentScreen === 'Communication') {
    return <CommunicationScreen onGoBack={() => navigateTo('Home')} />;
  }

  return <HomeScreen onNavigate={(screen) => navigateTo(screen as any)} />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  mainHeader: { paddingTop: 20, paddingBottom: 10 },
  mainHeaderText: { fontSize: 28, fontWeight: "900", color: "#1E293B" },
  subHeaderText: { fontSize: 16, color: "#64748B", fontWeight: "500", marginTop: 4 },
  scrollContent: { padding: 20, gap: 20, marginTop: 10 },
  
  headerWithBack: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  backBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  headerSpacer: { width: 40 },

  menuCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 20, borderRadius: 24, elevation: 2 },
  menuIconCircle: { padding: 16, borderRadius: 20, marginRight: 16 },
  menuTextContent: { flex: 1 },
  menuTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  menuDesc: { fontSize: 13, color: "#64748B", fontWeight: "500" },

  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, gap: 15 },
  wipTitle: { fontSize: 22, fontWeight: "800", color: "#334155" },
  wipDesc: { fontSize: 15, color: "#64748B", textAlign: "center", lineHeight: 22 },

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
  scanningIndicatorText: { fontSize: 13, color: "#0369A1", fontWeight: "700", includeFontPadding: false, textAlignVertical: "center" },
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
  newIconCircle: { backgroundColor: "#F1F5F9" },
  newBadge: { backgroundColor: "#F1F5F9" },
  newBadgeText: { color: "#64748B" },
  
  pairedCard: { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" },
  pairedIconCircle: { backgroundColor: "#E0F2FE" },
  pairedBadge: { backgroundColor: "#E0F2FE" },
  pairedBadgeText: { color: "#0284C7" },
  
  connectedCard: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC", borderWidth: 1.5 },
  connectedIconCircle: { backgroundColor: "#10B981" },
  connectedBadge: { backgroundColor: "#DCFCE7" },
  connectedBadgeText: { color: "#15803D" },
});