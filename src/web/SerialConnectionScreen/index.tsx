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
import { useSerialStore } from '../constants';

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export default function SerialConnectionScreen() {
  const connectedPort = useSerialStore((state) => state.connectedPort);
  const setConnectedPort = useSerialStore((state) => state.setConnectedPort);
  const portName = useSerialStore((state) => state.portName);
  const setPortName = useSerialStore((state) => state.setPortName);
  const messages = useSerialStore((state) => state.messages);
  const setMessages = useSerialStore((state) => state.setMessages);
  const manuallyDisconnected = useSerialStore(
    (state) => state.manuallyDisconnected
  );
  const setManuallyDisconnected = useSerialStore(
    (state) => state.setManuallyDisconnected
  );

  const navigation = useNavigation<AppNavigationProp>();
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };

  const [modalVisible, setModalVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<SerialPortInfo[]>([]);

  useEffect(() => {
    // Web Serial API kontrolü
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      // Tarayıcı Web Serial API'yi destekliyor
    } else {
      Alert.alert(
        'Hata',
        'Tarayıcınız Web Serial API desteklemiyor. Chrome veya Edge kullanın.'
      );
    }
  }, []);

  const openSerialModal = async () => {
    try {
      // Kullanıcıdan port seçmesini iste
      if ('serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        setAvailablePorts([{ usbVendorId: port.usbVendorId, usbProductId: port.usbProductId }]);
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Port seçme hatası:', error);
      Alert.alert('Hata', 'Port seçilemedi.');
    }
  };

  const connectToPort = async (portInfo: SerialPortInfo) => {
    try {
      setModalVisible(false);
      setIsConnecting(true);

      if ('serial' in navigator) {
        const ports = await (navigator as any).serial.getPorts();
        const port = ports.find(
          (p: any) =>
            p.usbVendorId === portInfo.usbVendorId &&
            p.usbProductId === portInfo.usbProductId
        );

        if (port) {
          await port.open({ baudRate: 9600 });

          const serialPort = {
            readable: port.readable,
            writable: port.writable,
            close: async () => {
              await port.close();
            },
          };

          setConnectedPort(serialPort);
          setPortName(`COM Port (${portInfo.usbVendorId})`);
          setMessages([]);
        }
      }

      setIsConnecting(false);
    } catch (e) {
      console.error('Bağlantı hatası:', e);
      setIsConnecting(false);
      Alert.alert('Hata', 'Bağlantı kurulamadı.');
    }
  };

  const disconnectPort = async () => {
    if (connectedPort) {
      Alert.alert('Bağlantıyı Kes', 'Bağlantı kesilecek. Emin misiniz?', [
        {
          text: 'Vazgeç',
          style: 'cancel',
        },
        {
          text: 'Kes',
          style: 'destructive',
          onPress: async () => {
            setManuallyDisconnected(true);
            await connectedPort.close();
            setConnectedPort(null);
            setPortName(null);
            setMessages([]);
          },
        },
      ]);
    }
  };

  const renderPortItem = ({ item }: { item: SerialPortInfo }) => {
    const isConnected = !!connectedPort;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.deviceListItem,
          pressed && styles.deviceListItemPressed,
        ]}
        onPress={() => (isConnected ? disconnectPort() : connectToPort(item))}
      >
        <View style={styles.listIconCircle}>
          <Icon name="serial-port" size={22} color={isConnected ? '#0284C7' : '#64748B'} />
        </View>
        <View style={styles.listTextSection}>
          <Text style={styles.deviceName}>
            {item.usbVendorId ? `USB Device (${item.usbVendorId})` : 'Seri Port'}
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
        <Text style={styles.headerTitle}>Seri Port Bağlantısı</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.scanButton} onPress={openSerialModal}>
          <Icon name="magnify" size={24} color="#FFFFFF" />
          <Text style={styles.scanButtonText}>Port Seç</Text>
        </TouchableOpacity>

        {isConnecting && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={styles.loadingText}>Bağlanıyor...</Text>
          </View>
        )}

        {connectedPort && (
          <View style={styles.connectedInfo}>
            <View style={styles.connectedInfoRow}>
              <Icon name="check-circle" size={20} color="#10B981" />
              <Text style={styles.connectedInfoText}>
                Bağlı: {portName || 'Seri Port'}
              </Text>
            </View>
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnectPort}>
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
              <Text style={styles.modalTitle}>Kullanılabilir Portlar</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={availablePorts}
              renderItem={renderPortItem}
              keyExtractor={(item, index) => index.toString()}
              style={styles.deviceList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
