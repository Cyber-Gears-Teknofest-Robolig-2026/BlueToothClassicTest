
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  customSplashContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 60,
  },
  customSplashLogo: {
    width: 160,
    height: 160,
  },
  customSplashFooter: {
    color: "#666666",
    fontSize: 14,
    fontWeight: "500",
  },

  container: {
    flex: 1,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 28,
    borderRadius: 22,
    minWidth: 320,
    alignItems: "center",
    elevation: 6,
  },
  platform: {
    fontSize: 24,
    fontWeight: "800",
    color: "blue",
    marginBottom: 8,
  },
  platformValue: {
    color: "green",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 22,
  },
  row: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
  },
  btn: {
    width: 78,
    height: 78,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  plus: {
    backgroundColor: "#22C55E",
  },
  minus: {
    backgroundColor: "#F97316",
  },
  btnText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  count: {
    fontSize: 38,
    fontWeight: "800",
    color: "#111827",
  },
});