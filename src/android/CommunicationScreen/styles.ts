import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  headerStatusConnected: {
    fontSize: 13,
    color: "green",
    fontWeight: "500",
  },
  headerStatusNotConnected: {
    fontSize: 13,
    color: "red",
    fontWeight: "500",
  },
  clearButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  messagesContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  messageWrapperSent: {
    justifyContent: "flex-end",
  },
  messageWrapperReceived: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageBubbleSent: {
    backgroundColor: "#DCF8C6",
    borderBottomRightRadius: 2,
  },
  messageBubbleReceived: {
    backgroundColor: "#DDDDDD",
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    color: "#000000",
    lineHeight: 20,
  },
  messageTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: "#667781",
    marginRight: 4,
  },
  messageCheck: {
    marginLeft: 2,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#ECE5DD",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attachButton: {
    padding: 4,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#000000",
    maxHeight: 100,
    paddingHorizontal: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
  },
  sendButtonEnabled: {
    backgroundColor: "#00AA00",
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
  },
  cameraButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default styles;