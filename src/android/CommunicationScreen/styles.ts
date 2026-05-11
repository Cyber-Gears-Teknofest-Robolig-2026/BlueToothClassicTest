
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  chatMainContainer: { 
    flex: 1, 
    backgroundColor: "#FFFFFF" 
  },
  chatHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: "#F1F5F9" 
  },
  chatTitle: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#1E293B" 
  },
  chatStatus: { 
    fontSize: 12, 
    color: "#10B981", 
    fontWeight: "600" 
  },
  backBtn: { 
    padding: 8, 
    backgroundColor: "#F1F5F9", 
    borderRadius: 12 
  },
  msgWrap: { 
    flexDirection: "row", 
    marginBottom: 8 
  },
  msgWrapMe: { 
    justifyContent: "flex-end" 
  },
  msgWrapYou: { 
    justifyContent: "flex-start" 
  },
  msgBubble: { 
    maxWidth: "80%", 
    padding: 12, 
    borderRadius: 15
  },
  msgBubbleMe: { 
    backgroundColor: "#3B82F6", 
    borderBottomRightRadius: 4 
  },
  msgBubbleYou: { 
    backgroundColor: "green", 
    borderBottomLeftRadius: 4 
  },
  msgText: { 
    color: "#FFFFFF", 
    fontSize: 14 
  },
  inputContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#F8FAFC", 
    borderRadius: 24, 
    margin: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 8 
  },
  input: { 
    flex: 1, 
    fontSize: 14, 
    color: "#1E293B", 
    paddingVertical: 8 
  },
  sendBtn: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: "center", 
    alignItems: "center",
  },
  chatContent: { 
    paddingHorizontal: 15, 
    paddingVertical: 20 
  },
  inputRowContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  inputBubble: { 
    flex: 1, 
    flexDirection: "row", 
    backgroundColor: "#F1F5F9", 
    borderRadius: 25, 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "transparent" 
  },
  inputBubbleFocused: { 
    borderColor: "#075E54", 
    backgroundColor: "#FFFFFF",
  },
  textInput: { 
    flex: 1, 
    marginLeft: 1, 
    fontSize: 16, 
    color: "#1E293B", 
    paddingVertical: 4 
  },
});

export default styles;