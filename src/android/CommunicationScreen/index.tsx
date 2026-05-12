import { useState, useEffect, useRef, useCallback } from "react";
import {
  FlatList,
  TextInput,
  Keyboard,
  Alert,
  View,
  TouchableOpacity,
  Text,
  ToastAndroid,
  ScrollView,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { Buffer } from "buffer";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {
  KeyboardAvoidingView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import {
  AppNavigationProp,
  useBluetoothStore,
} from "../App";

interface Message {
  id: number;
  text: string;
  mode: "sent" | "received";
  time: string;
}

export default function CommunicationScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const connectedDevice = useBluetoothStore((state) => state.connectedDevice);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const currentMessageId = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      scrollToBottom(true, 300);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setIsFocused(false);
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
    const readSubscription = connectedDevice?.onDataReceived((event) => {
      const receivedData = Buffer.from(event.data, "base64")
        .toString("utf-8")
        .trim();

      if (!receivedData) return;

      setMessages((prev) => [
        ...prev,
        {
          id: currentMessageId.current,
          text: receivedData,
          mode: "received",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      currentMessageId.current++;
    });

    return () => {
      readSubscription?.remove();
    };
  }, [connectedDevice]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true, 100);
    }
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const sendedData = inputText.trim();

    try {
      if (connectedDevice) {
        await connectedDevice.write(sendedData + "\r\n");
      }

      setMessages((prev) => [
        ...prev,
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
    } catch (e) {
      Alert.alert("Hata", "Veri gönderilemedi. Cihaz bağlı mı?");
    }
  };

  const clearMessages = () => {
    if (messages.length === 0) {
      ToastAndroid.show("Silinecek mesaj yok", ToastAndroid.SHORT);
      return;
    }

    Alert.alert(
      "Mesajları Temizle",
      "Ekrandaki bütün mesajlar silinecek. Emin misiniz?",
      [
        {
          text: "Vazgeç",
          style: "cancel",
        },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            setMessages([]);
            currentMessageId.current = 0;
            ToastAndroid.show("Mesajlar Silindi", ToastAndroid.SHORT);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color="#000000" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {connectedDevice?.name || "Bağlı Değil"}
          </Text>
          <Text 
            style={
              connectedDevice ? styles.headerStatusConnected : styles.headerStatusNotConnected
            }
          >
            {connectedDevice ? "Çevrimiçi" : "Çevrimdışı"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={clearMessages}
          style={styles.clearButton}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
            Mesajları Temizle
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            contentContainerStyle={styles.messagesContent}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageWrapper,
                  item.mode === "sent"
                    ? styles.messageWrapperSent
                    : styles.messageWrapperReceived,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    item.mode === "sent"
                      ? styles.messageBubbleSent
                      : styles.messageBubbleReceived,
                  ]}
                >
                  <Text style={styles.messageText} selectable={true}>{item.text}</Text>
                  <View style={styles.messageTimeContainer}>
                    <Text style={styles.messageTime}>{item.time}</Text>
                  </View>
                </View>
              </View>
            )}
            onContentSizeChange={() => {
              scrollToBottom(true, 100);
            }}
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Mesaj yazın..."
              placeholderTextColor="#54656F"
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => {
                setIsFocused(true);
                scrollToBottom(true, 150);
              }}
              onBlur={() => setIsFocused(false)}
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />

            <TouchableOpacity
              style={[
                !inputText.trim() ? styles.sendButtonDisabled : styles.sendButtonEnabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Icon name="send" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            {/*{inputText.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
              >
                <Icon name="send" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cameraButton}>
                <Icon name="camera" size={24} color="#54656F" />
              </TouchableOpacity>
            )}*/}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
