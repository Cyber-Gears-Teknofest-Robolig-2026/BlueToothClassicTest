import { BluetoothDevice } from "react-native-bluetooth-classic";
import { useState, useEffect, useRef } from "react";
import { 
  FlatList, 
  TextInput,
  Keyboard,
  Alert,
  View,
  TouchableOpacity,
  Text,
  Platform
} from "react-native";
import { 
  useSafeAreaInsets, 
  SafeAreaView 
} from "react-native-safe-area-context";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import { Buffer } from 'buffer';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { 
  KeyboardAvoidingView, 
  KeyboardStickyView 
} from 'react-native-keyboard-controller';
import styles from './styles';

interface Message {
  id: string;
  text: string;
  isSender: boolean;
  time: string;
}

export default function CommunicationScreen({ onGoBack, connectedDevice }: { onGoBack: () => void, connectedDevice: BluetoothDevice | null }) {
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