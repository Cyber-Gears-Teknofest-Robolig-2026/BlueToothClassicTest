import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  Keyboard,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import type { AppNavigationProp } from "../constants";
import { useBluetoothStore } from "../constants";
import type { Subscription } from "../BluetoothContext";

interface Message {
  id: number;
  text: string;
  mode: "sent" | "received";
  time: string;
}

export default function CommunicationScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);
  const messages = useBluetoothStore((state) => state.messages);
  const setMessages = useBluetoothStore((state) => state.setMessages);
  const setManuallyDisconnected = useBluetoothStore(
    (state) => state.setManuallyDisconnected
  );
  const setConnectedDevice = useBluetoothStore((state) => state.setConnectedDevice);
  const deviceName = useBluetoothStore((state) => state.deviceName);
  const setDeviceName = useBluetoothStore((state) => state.setDeviceName);

  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const readSubscriptionRef = useRef<Subscription | null>(null);

  const currentMessageId = useRef(0);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      scrollToBottom(true, 300);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
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

  // Gelen veriyi dinle (backend birleşik onDataReceived arayüzü sağlar).
  useEffect(() => {
    if (connectedDevice) {
      readSubscriptionRef.current = connectedDevice.onDataReceived((event) => {
        const text = (event.data || "").toString().trim();
        if (!text) return;
        setMessages([
          ...messagesRef.current,
          {
            id: currentMessageId.current,
            text,
            mode: "received",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        currentMessageId.current++;
      });
    }

    return () => {
      if (readSubscriptionRef.current) {
        readSubscriptionRef.current.remove();
        readSubscriptionRef.current = null;
      }
    };
  }, [connectedDevice]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    if (!connectedDevice) {
      window.alert("Hata: Cihaz bağlı değil.");
      return;
    }

    const sendedData = inputText.trim();

    try {
      await connectedDevice.write(sendedData + "\r\n");

      setMessages([
        ...messages,
        {
          id: currentMessageId.current,
          text: sendedData,
          mode: "sent",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      currentMessageId.current++;
      setInputText("");
      scrollToBottom(true, 150);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } catch (e) {
      window.alert("Hata: Veri gönderilemedi.");
    }
  };

  const clearMessages = () => {
    if (messages.length === 0) {
      window.alert("Bilgi: Silinecek mesaj yok");
      return;
    }

    if (window.confirm("Ekrandaki bütün mesajlar silinecek. Emin misiniz?")) {
      setMessages([]);
      currentMessageId.current = 0;
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      if (window.confirm("Bağlantı kesilecek. Emin misiniz?")) {
        try {
          setManuallyDisconnected(true);
          if (readSubscriptionRef.current) {
            readSubscriptionRef.current.remove();
            readSubscriptionRef.current = null;
          }
          await connectedDevice.disconnect();
        } finally {
          setConnectedDevice(null);
          setDeviceName(null);
          setMessages([]);
          navigation.goBack();
        }
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSent = item.mode === "sent";
    return (
      <View
        style={[
          styles.messageWrapper,
          isSent ? styles.messageWrapperSent : styles.messageWrapperReceived,
        ]}
        key={item.id}
      >
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
            selectable
          >
            {item.text}
          </Text>
          <View style={styles.messageTimeContainer}>
            <Text
              style={[
                styles.messageTime,
                isSent ? styles.sentTime : styles.receivedTime,
              ]}
            >
              {item.time}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#000000" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{deviceName || "Bağlı Değil"}</Text>
            <Text
              style={
                connectedDevice
                  ? styles.headerStatusConnected
                  : styles.headerStatusNotConnected
              }
            >
              {connectedDevice ? "Çevrimiçi" : "Çevrimdışı"}
            </Text>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => {
              const idx = navigation.getState()?.index ?? 0;
              if (idx > 0 && typeof window !== "undefined") {
                window.history.go(-idx);
              } else {
                navigation.navigate("Home");
              }
            }}
            style={styles.headerIconButton}
          >
            <Icon name="home" size={25} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("BluetoothConnection")}
            style={styles.headerIconButtonCog}
          >
            <Icon name="cog" size={25} color="#000000" />
          </TouchableOpacity>
          {connectedDevice ? (
            <TouchableOpacity
              onPress={disconnectDevice}
              style={styles.headerIconButtonBluetoothOff}
            >
              <Icon name="bluetooth-off" size={25} color="#FF0000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate("BluetoothConnection")}
              style={styles.headerIconButtonBluetoothConnect}
            >
              <Icon name="bluetooth-connect" size={25} color="#10B981" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={clearMessages}
            style={styles.headerIconButtonTrash}
          >
            <Icon name="trash-can" size={25} color="#FFFFFF" />
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
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Mesaj yazın..."
            placeholderTextColor="#54656F"
            value={inputText}
            onChangeText={setInputText}
            multiline={false}
            onKeyPress={(e: any) => {
              const key = e?.nativeEvent?.key ?? e?.key;
              if (key === "Enter") {
                if (typeof e.preventDefault === "function") e.preventDefault();
                sendMessage();
              }
            }}
          />
          <TouchableOpacity
            style={
              !inputText.trim() || !connectedDevice
                ? styles.sendButtonDisabled
                : styles.sendButton
            }
            onPress={sendMessage}
            disabled={!inputText.trim() || !connectedDevice}
          >
            <Icon name="send" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
