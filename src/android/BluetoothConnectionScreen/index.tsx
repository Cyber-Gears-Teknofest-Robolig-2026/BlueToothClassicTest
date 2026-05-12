import {
  Animated, 
  PanResponder, 
  View,
  useWindowDimensions, 
  PermissionsAndroid,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Text,
  ScrollView,
  Modal,
  StatusBar,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import RNBluetoothClassic, { BluetoothDevice } from "react-native-bluetooth-classic";
import { 
  useSafeAreaInsets, 
  SafeAreaView 
} from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import styles from './styles';
import { useNavigation } from "@react-navigation/native";
import { 
  AppNavigationProp,
  useBluetoothStore 
} from "../App";

export default function BluetoothConnectionScreen() {

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);

  const navigation = useNavigation<AppNavigationProp>();

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

  const openBluetoothModal = async () => {
    
    setModalVisible(true);
    animateToPoint(isLandscape ? SNAP_FULL : SNAP_PARTIAL);

    setScanning(true);

    const permissionsResult = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);

    for (const [key, value] of Object.entries(permissionsResult)) {
      if (value !== 'granted') {
        Alert.alert('Permissions Required', 'Bluetooth permissions are required to scan and connect to devices.');
        return;
      }
    }

    await RNBluetoothClassic.cancelDiscovery();

    const bonded = await RNBluetoothClassic.getBondedDevices();

    setDevices(bonded.map((d: any) => ({ ...d, bonded: true })));

    const discovered = await RNBluetoothClassic.startDiscovery();

    const map = new Map();
    [...bonded, ...discovered].forEach(d => map.set(d.address, { 
      ...d, bonded: bonded.some(b => b.address === d.address) 
    }));
    setDevices(Array.from(map.values()));

    setScanning(false);
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      closeModal();
      setIsConnecting(true);
      const connected = await RNBluetoothClassic.connectToDevice(device.address, {
        connectorType: "rfcomm",
        connectionType: "binary",
        //READ_SIZE: 1,
        //READ_TIMEOUT: 0,
        delimiter: "\n",
        encoding: "utf-8",
      });
      setConnectedDevice(connected);
      setIsConnecting(false);
    } 
    catch (e) { 
      console.error("Connection error:", e); 
      setIsConnecting(false); 
      Alert.alert("Hata", "Bağlantı kurulamadı."); 
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      await RNBluetoothClassic.disconnectFromDevice(connectedDevice.address);
      setConnectedDevice(null);
    }
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bluetooth Yönetimi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
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
            <View style={{ flex: 1 }}>
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