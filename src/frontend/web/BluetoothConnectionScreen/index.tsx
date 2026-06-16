import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import type { AppNavigationProp } from "../constants";
import { useBluetoothStore } from "../constants";
import { useBluetooth } from "../BluetoothContext";

export default function BluetoothConnectionScreen() {
  // Bluetooth motoruna SADECE bu hook üzerinden erişilir (native import yok).
  const bt = useBluetooth();

  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const deviceName = useBluetoothStore((state) => state.deviceName);
  const setDeviceName = useBluetoothStore((state) => state.setDeviceName);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );

  const navigation = useNavigation<AppNavigationProp>();

  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    bt.isEnabled().then((ok) => {
      if (!ok && typeof window !== "undefined") {
        window.alert(
          "Hata: Tarayıcınız Web Serial API desteklemiyor. Chrome veya Edge kullanın."
        );
      }
    });
  }, [bt]);

  const selectAndConnect = async () => {
    try {
      setIsConnecting(true);
      const connected = await bt.connect();
      setConnectedDevice(connected);
      setDeviceName(connected.name);
      setMessages([]);
    } catch (e) {
      // Kullanıcı port seçmeyi iptal ettiyse sessiz geç.
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      const confirmed = window.confirm("Cihaz bağlantısı kesilsin mi?");
      if (confirmed) {
        setManuallyDisconnected(true);
        await connectedDevice.disconnect();
        setConnectedDevice(null);
        setDeviceName(null);
        setMessages([]);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.headerWithBack}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bluetooth Yönetimi</Text>
        <TouchableOpacity
          onPress={() => {
            const idx = navigation.getState()?.index ?? 0;
            if (idx > 0 && typeof window !== "undefined") {
              window.history.go(-idx);
            } else {
              navigation.navigate("Home");
            }
          }}
          style={styles.homeBtn}
        >
          <Icon name="home" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Icon
            name="bluetooth"
            size={32}
            color={isConnecting ? "#F59E0B" : connectedDevice ? "#10B981" : "#EF4444"}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.statusLabelRow}>
              <Text style={styles.label}>BAĞLANTI DURUMU</Text>
              {isConnecting ? (
                <View style={styles.connectingBadge}>
                  <ActivityIndicator
                    size="small"
                    color="#F59E0B"
                    style={styles.smallSpinner}
                  />
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
            <Text style={styles.infoText}>
              {isConnecting
                ? "Lütfen bekleyin..."
                : connectedDevice
                ? deviceName || "Seri Cihaz"
                : "Cihaz seçilmedi"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={selectAndConnect}
          disabled={isConnecting}
        >
          <Text style={styles.scanBtnText}>Cihaz Seç ve Bağlan</Text>
        </TouchableOpacity>
        {connectedDevice && !isConnecting && (
          <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectDevice}>
            <Text style={styles.disconnectBtnText}>Bağlantıyı Kes</Text>
          </TouchableOpacity>
        )}
      </View>

      {connectedDevice && !isConnecting && (
        <TouchableOpacity
          style={styles.communicationBtn}
          onPress={() => navigation.navigate("Communication")}
        >
          <View style={styles.communicationBtnContent}>
            <Icon name="swap-horizontal" size={28} color="#fff" />
            <Text style={styles.communicationBtnText}>İletişim Ekranına Git</Text>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
