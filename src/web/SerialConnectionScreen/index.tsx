import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import styles from './styles';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../constants';
import { useBluetoothStore } from '../constants';

interface BluetoothDeviceInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export default function BluetoothConnectionScreen() {
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const deviceName = useBluetoothStore((state) => state.deviceName);
  const setDeviceName = useBluetoothStore((state) => state.setDeviceName);
  const messages = useBluetoothStore((state) => state.messages);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const manuallyDisconnected = useBluetoothStore(
    (state) => state.manuallyDisconnected
  );
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );

  const navigation = useNavigation<AppNavigationProp>();
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };

  const [modalVisible, setModalVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<BluetoothDeviceInfo[]>([]);

  useEffect(() => {
    // Web Bluetooth API kontrolü
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      // Tarayıcı Web Bluetooth API'yi destekliyor
    } else {
      Alert.alert(
        'Hata',
        'Tarayıcınız Web Bluetooth API desteklemiyor. Chrome veya Edge kullanın.'
      );
    }
  }, []);

  const openBluetoothModal = async () => {
    try {
      // Kullanıcıdan port seçmesini iste
      if ('serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        setAvailableDevices([{ usbVendorId: port.usbVendorId, usbProductId: port.usbProductId }]);
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Cihaz seçme hatası:', error);
      Alert.alert('Hata', 'Cihaz seçilemedi.');
    }
  };

  const connectToDevice = async (deviceInfo: BluetoothDeviceInfo) => {
    try {
      setModalVisible(false);
      setIsConnecting(true);

      if ('serial' in navigator) {
        const ports = await (navigator as any).serial.getPorts();
        const port = ports.find(
          (p: any) =>
            p.usbVendorId === deviceInfo.usbVendorId &&
            p.usbProductId === deviceInfo.usbProductId
        );

        if (port) {
          await port.open({ baudRate: 9600 });

          const bluetoothDevice = {
            readable: port.readable,
            writable: port.writable,
            close: async () => {
              await port.close();
            },
          };

          setConnectedDevice(bluetoothDevice);
          setDeviceName(`Bluetooth Cihazı (${deviceInfo.usbVendorId})`);
          setMessages([]);
        }
      }

      setIsConnecting(false);
    } catch (e) {
      console.error('Bağlantı hatası:', e);
      setIsConnecting(false);
      Alert.alert('Hata', 'Bluetooth bağlantısı kurulamadı.');
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      const confirmed = window.confirm("Cihaz bağlantısı kesilsin mi?");
      if (confirmed) {
        setManuallyDisconnected(true);
        await connectedDevice.close();
        setConnectedDevice(null);
        setDeviceName(null);
        setMessages([]);
      }
    }
  };

  const renderDeviceItem = ({ item }: { item: BluetoothDeviceInfo }) => {
    const isConnected = !!connectedDevice;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.deviceListItem,
          pressed && styles.deviceListItemPressed,
        ]}
        onPress={() => (isConnected ? disconnectDevice() : connectToDevice(item))}
      >
        <View style={styles.listIconCircle}>
          <Icon name="bluetooth" size={22} color={isConnected ? '#0284C7' : '#64748B'} />
        </View>
        <View style={styles.listTextSection}>
          <Text style={styles.deviceName}>
            {item.usbVendorId ? `USB Device (${item.usbVendorId})` : 'Bluetooth Cihazı'}
          </Text>
          {item.usbProductId && (
            <Text style={styles.deviceAddress}>Product ID: {item.usbProductId}</Text>
          )}
        </View>
        <Icon
          name={isConnected ? 'check-circle' : 'chevron-right'}
          size={24}
          color={isConnected ? '#10B981' : '#CBD5E1'}
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bluetooth Bağlantısı</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.scanButton} onPress={openBluetoothModal}>
          <Icon name="magnify" size={24} color="#FFFFFF" />
          <Text style={styles.scanButtonText}>Cihaz Seç</Text>
        </TouchableOpacity>

        {isConnecting && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={styles.loadingText}>Bağlanıyor...</Text>
          </View>
        )}

        {connectedDevice && (
          <View style={styles.connectedInfo}>
            <View style={styles.connectedInfoRow}>
              <Icon name="check-circle" size={20} color="#10B981" />
              <Text style={styles.connectedInfoText}>
                Bağlı: {deviceName || 'Bluetooth Cihazı'}
              </Text>
            </View>
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnectDevice}>
              <Text style={styles.disconnectButtonText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kullanılabilir Cihazlar</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableDevices}
              renderItem={renderDeviceItem}
              keyExtractor={(item, index) => index.toString()}
              style={styles.deviceList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
