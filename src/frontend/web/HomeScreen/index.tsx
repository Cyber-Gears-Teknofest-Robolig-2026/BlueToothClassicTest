import {
  StatusBar,
  View,
  Text,
  ScrollView,
  TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import styles from "./styles";
import { useNavigation } from "@react-navigation/native";
import { AppNavigationProp } from "../constants";

const BluetoothConnectionButton = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.menuCard} onPress={() => navigation.navigate('BluetoothConnection')}>
      <View style={[styles.menuIconCircle, { backgroundColor: "#E0F2FE" }]}>
        <MaterialCommunityIcons name="bluetooth" size={30} color="#0284C7" />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={styles.menuTitle}>Bluetooth Bağlantısı</Text>
        <Text style={styles.menuDesc}>Cihazları tara, eşleş ve yönet</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

const CommunicationButton = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.menuCard} onPress={() => navigation.navigate('Communication')}>
      <View style={[styles.menuIconCircle, { backgroundColor: "#DCFCE7" }]}>
        <MaterialCommunityIcons name="swap-horizontal" size={30} color="#15803D" />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={styles.menuTitle}>Cihaz İletişimi</Text>
        <Text style={styles.menuDesc}>Bağlı cihaz ile veri alışverişi yap</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

const CarControlButton = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.menuCard} onPress={() => navigation.navigate('CarControl')}>
      <View style={[styles.menuIconCircle, { backgroundColor: "#FDE68A" }]}>
        <MaterialCommunityIcons name="car" size={30} color="#854D0E" />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={styles.menuTitle}>Araç Kontrol</Text>
        <Text style={styles.menuDesc}>Bağlı cihaz ile araç kontrolü yap</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

const SettingsButton = () => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.menuCard} onPress={() => navigation.navigate('Settings')}>
      <View style={[styles.menuIconCircle, { backgroundColor: "#EDE9FE" }]}>
        <MaterialCommunityIcons name="cog" size={30} color="#6D28D9" />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={styles.menuTitle}>Ayarlar</Text>
        <Text style={styles.menuDesc}>Gönderim başlıkları ve varsayılan değerleri düzenle</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {

  return (
    <SafeAreaView style={styles.container} edges={[
      "top",
      "left",
      "right",
      "bottom"
    ]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={[styles.mainHeader, { paddingHorizontal: 25 }]}
      >
        <Text style={styles.mainHeaderText}>Cyber Gears BlueTooth Low Energy</Text>
        <Text style={styles.subHeaderText}>Lütfen bir işlem seçin</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BluetoothConnectionButton />
        <CarControlButton />
        <CommunicationButton />
        <SettingsButton />
      </ScrollView>

    </SafeAreaView>
  );
};