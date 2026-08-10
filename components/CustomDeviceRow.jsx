// components/CustomDeviceRow.jsx
// One row for a user-added device on the Devices screen. Sends the
// device's toggle frame through the raw CAN endpoint and tracks the
// on/off state locally (custom instances have no status feedback yet).

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RVControlService } from '../API/rvAPI';
import CustomDeviceStore from '../Service/CustomDeviceStore';

const CustomDeviceRow = ({ device, onStatus }) => {
  const [isOn, setIsOn] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await RVControlService.executeRawCommand(CustomDeviceStore.toggleCommand(device));
      const next = !isOn;
      setIsOn(next);
      if (onStatus) onStatus(`${device.name} toggled ${next ? 'ON' : 'OFF'}`);
    } catch (error) {
      if (onStatus) onStatus(`Failed to toggle ${device.name}`);
      console.error('CustomDeviceRow: toggle failed:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{device.name}</Text>
        <Text style={styles.meta}>
          {device.type === 'dimmable' ? 'Dimmable' : 'Latch'} - instance {device.instanceHex}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.toggle, isOn && styles.toggleOn]}
        onPress={handleToggle}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator size="small" color={isOn ? '#000' : '#FFF'} />
        ) : (
          <Ionicons name="power" size={20} color={isOn ? '#000' : '#FFF'} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#FFF',
    fontSize: 16,
  },
  meta: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#FFB267',
  },
});

export default CustomDeviceRow;
