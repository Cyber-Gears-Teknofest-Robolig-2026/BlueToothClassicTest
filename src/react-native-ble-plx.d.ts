declare module 'react-native-ble-plx' {
  export class BleManager {
    constructor();
    startDeviceScan(serviceUUIDs?: string[] | null, options?: any, listener?: (error: any, device: Device | null) => void): void;
    stopDeviceScan(): void;
    connectToDevice(id: string, options?: any): Promise<Device>;
    cancelDeviceConnection(id: string): Promise<void>;
    state?(): Promise<string> | string;
    enable?(): Promise<void>;
  }

  export type Device = {
    id: string;
    name?: string | null;
    localName?: string | null;
    writeCharacteristicWithResponseForService(service: string, char: string, value: string): Promise<any>;
    monitorCharacteristicForService(service: string, char: string, callback: (error: any, characteristic: any) => void): { remove: () => void };
    discoverAllServicesAndCharacteristics(): Promise<void>;
  };

  const _default: any;
  export default _default;
}
