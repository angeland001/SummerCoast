// Service/CustomDeviceStore.js
// Persistent list of user-added devices. A custom device is a name plus
// an RV-C dimmer instance (two hex digits) and a type that decides which
// toggle command the app sends:
//   dimmable -> 19FEDB9F#<II>FFFA05FF00FFFF (toggle, level FA)
//   latch    -> 19FEDB9F#<II>FFC805FF00FFFF (toggle, level C8)
// Matches the command patterns in the server's predefined dictionary.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@coast_custom_devices';

let devices = [];
let loaded = false;
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener([...devices]);
    } catch (error) {
      console.error('CustomDeviceStore: listener error:', error);
    }
  });
};

const persist = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
  } catch (error) {
    console.error('CustomDeviceStore: failed to save:', error);
  }
};

export const CustomDeviceStore = {
  load: async () => {
    if (loaded) return [...devices];
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      devices = raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('CustomDeviceStore: failed to load:', error);
      devices = [];
    }
    loaded = true;
    return [...devices];
  },

  getAll: () => [...devices],

  // Returns an unsubscribe function; immediately emits the current list.
  subscribe: (listener) => {
    listeners.add(listener);
    CustomDeviceStore.load().then(() => listener([...devices]));
    return () => listeners.delete(listener);
  },

  add: async ({ name, type, instanceHex }) => {
    const device = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      type, // 'dimmable' | 'latch'
      instanceHex: instanceHex.toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    devices = [...devices, device];
    await persist();
    notify();
    return device;
  },

  remove: async (id) => {
    devices = devices.filter((device) => device.id !== id);
    await persist();
    notify();
  },

  // The raw CAN frame this device's toggle sends.
  toggleCommand: (device) => {
    const level = device.type === 'dimmable' ? 'FA' : 'C8';
    return `19FEDB9F#${device.instanceHex}FF${level}05FF00FFFF`;
  },

  isValidInstanceHex: (text) => /^[0-9A-Fa-f]{2}$/.test(text),
};

export default CustomDeviceStore;
