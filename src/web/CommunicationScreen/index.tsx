import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Alert,
  TouchableOpacity,
  Text,
  FlatList,
  Keyboard,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import styles from './styles';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../constants';
import { useBluetoothStore } from '../constants';

interface Message {
  id: number;
  text: string;
  mode: 'sent' | 'received';
  time: string;
}

export default function CommunicationScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const messages = useBluetoothStore((state) => state.messages);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const manuallyDisconnected = useBluetoothStore(
    (state) => state.manuallyDisconnected
  );
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const deviceName = useBluetoothStore((state) => state.deviceName);
  const setDeviceName = useBluetoothStore((state) => state.setDeviceName);

  const [inputText, setInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readLoopRef = useRef<boolean>(false);

  const currentMessageId = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef = useRef<Message[]>([]);

  const scrollToBottom = useCallback((animated = true, delay = 100) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    requestAnimationFrame(() => {
      scrollTimeoutRef.current = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, delay);
    });
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      scrollToBottom(true, 300);
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      scrollToBottom(true, 100);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [scrollToBottom]);

  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 0) {
      scrollToBottom(true, 100);
    }
  }, [messages, scrollToBottom]);

  // Bluetooth okuma
  useEffect(() => {
    const readFromBluetooth = async () => {
      if (!connectedDevice || !connectedDevice.readable) return;

      try {
        const reader = connectedDevice.readable.getReader();
        readerRef.current = reader;
        readLoopRef.current = true;

        while (readLoopRef.current) {
          const { value, done } = await reader.read();
          if (done) break;

          if (value) {
            const text = new TextDecoder().decode(value).trim();
            if (text) {
              setMessages([
                ...messagesRef.current,
                {
                  id: currentMessageId.current,
                  text: text,
                  mode: 'received',
                  time: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
              ]);
              currentMessageId.current++;
            }
          }
        }
      } catch (error) {
        console.error('Okuma hatası:', error);
      } finally {
        readerRef.current = null;
      }
    };

    if (connectedDevice && connectedDevice.readable) {
      readFromBluetooth();
    }

    return () => {
      readLoopRef.current = false;
      if (readerRef.current) {
        readerRef.current.cancel();
        readerRef.current = null;
      }
    };
  }, [connectedDevice]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    if (!connectedDevice || !connectedDevice.writable) {
      Alert.alert('Hata', 'Port bağlı değil veya yazılabilir değil.');
      return;
    }

    const sendedData = inputText.trim();

    try {
      const writer = connectedDevice.writable.getWriter();
      await writer.write(new TextEncoder().encode(sendedData + '\r\n'));
      writer.releaseLock();

      setMessages([
        ...messages,
        {
          id: currentMessageId.current,
          text: sendedData,
          mode: 'sent',
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);

      currentMessageId.current++;
      setInputText('');
      scrollToBottom(true, 150);
    } catch (e) {
      Alert.alert('Hata', 'Veri gönderilemedi.');
    }
  };

  const clearMessages = () => {
    if (messages.length === 0) {
      Alert.alert('Bilgi', 'Silinecek mesaj yok');
      return;
    }

    Alert.alert('Mesajları Temizle', 'Ekrandaki bütün mesajlar silinecek. Emin misiniz?', [
      {
        text: 'Vazgeç',
        style: 'cancel',
      },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          setMessages([]);
          currentMessageId.current = 0;
        },
      },
    ]);
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      Alert.alert('Bağlantıyı Kes', 'Bağlantı kesilecek. Emin misiniz?', [
        {
          text: 'Vazgeç',
          style: 'cancel',
        },
        {
          text: 'Kes',
          style: 'destructive',
          onPress: async () => {
            try {
              setManuallyDisconnected(true);
              readLoopRef.current = false;
              if (readerRef.current) {
                await readerRef.current.cancel();
                readerRef.current = null;
              }
              await connectedDevice.close();
              setConnectedDevice(null);
              setDeviceName(null);
              setMessages([]);
              navigation.goBack();
            } catch (e) {
              console.error('Bağlantı kesme hatası:', e);
              // Force disconnect even if there's an error
              setConnectedDevice(null);
              setDeviceName(null);
              setMessages([]);
              navigation.goBack();
            }
          },
        },
      ]);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSent = item.mode === 'sent';
    return (
      <View
        style={[
          styles.messageBubble,
          isSent ? styles.sentBubble : styles.receivedBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isSent ? styles.sentText : styles.receivedText,
          ]}
        >
          {item.text}
        </Text>
        <Text
          style={[
            styles.messageTime,
            isSent ? styles.sentTime : styles.receivedTime,
          ]}
        >
          {item.time}
        </Text>
      </View>
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

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{deviceName || 'Bağlı Değil'}</Text>
          <Text
            style={
              connectedDevice ? styles.headerStatusConnected : styles.headerStatusNotConnected
            }
          >
            {connectedDevice ? 'Çevrimiçi' : 'Çevrimdışı'}
          </Text>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              })
            }
            style={styles.headerIconButton}
          >
            <Icon name="home" size={25} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('BluetoothConnection')}
            style={styles.headerIconButtonCog}
          >
            <Icon name="cog" size={25} color="#000000" />
          </TouchableOpacity>
          {connectedDevice && (
            <TouchableOpacity onPress={disconnectDevice} style={styles.headerIconButton}>
              <Icon name="bluetooth-off" size={25} color="#EF4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearMessages} style={styles.headerIconButton}>
            <Icon name="trash-can" size={25} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      />

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Mesaj yaz..."
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          multiline={false}
          onSubmitEditing={sendMessage}
          blurOnSubmit={true}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!inputText.trim() || !connectedDevice}
        >
          <Icon
            name="send"
            size={24}
            color={inputText.trim() && connectedDevice ? '#FFFFFF' : '#94A3B8'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
