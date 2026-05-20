import { create } from 'zustand';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  SerialConnection: undefined;
  Communication: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  close: () => Promise<void>;
}

interface Message {
  id: number;
  text: string;
  mode: 'sent' | 'received';
  time: string;
}

type SerialStore = {
  connectedPort: SerialPort | null;
  setConnectedPort: (port: SerialPort | null) => void;
  portName: string | null;
  setPortName: (name: string | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  manuallyDisconnected: boolean;
  setManuallyDisconnected: (manuallyDisconnected: boolean) => void;
};

export const useSerialStore = create<SerialStore>((set) => ({
  connectedPort: null,
  setConnectedPort: (port) => set({ connectedPort: port }),
  portName: null,
  setPortName: (name) => set({ portName: name }),
  messages: [],
  setMessages: (messages: Message[]) => set({ messages }),
  manuallyDisconnected: false,
  setManuallyDisconnected: (manuallyDisconnected: boolean) => set({ manuallyDisconnected }),
}));
