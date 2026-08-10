// components/AddDeviceModal.jsx
// Modal for adding a custom RV-C device. The user gives it a name, picks
// how it behaves (dimmable light vs latch/relay) and enters the two-digit
// instance from the RV-C documentation. The modal shows the exact CAN
// frame that will be sent so what happens on the bus is never a mystery.

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import CustomDeviceStore from '../Service/CustomDeviceStore';

const AddDeviceModal = ({ isVisible, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('latch');
  const [instanceHex, setInstanceHex] = useState('');
  const [error, setError] = useState(null);
  const [existing, setExisting] = useState([]);

  useEffect(() => {
    if (!isVisible) return undefined;
    const unsubscribe = CustomDeviceStore.subscribe(setExisting);
    return unsubscribe;
  }, [isVisible]);

  const hexValid = CustomDeviceStore.isValidInstanceHex(instanceHex);
  const preview = hexValid
    ? CustomDeviceStore.toggleCommand({ type, instanceHex })
    : null;

  const resetForm = () => {
    setName('');
    setType('latch');
    setInstanceHex('');
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Give the device a name');
      return;
    }
    if (!hexValid) {
      setError('Instance must be two hex digits, e.g. 2C');
      return;
    }
    if (existing.some((d) => d.instanceHex === instanceHex.toUpperCase())) {
      setError('A device with this instance already exists');
      return;
    }
    await CustomDeviceStore.add({ name, type, instanceHex });
    resetForm();
    onClose();
  };

  const handleRemove = (device) => {
    CustomDeviceStore.remove(device.id);
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Device</Text>
          <Text style={styles.subtitle}>
            Adds a device on the RV-C bus by its dimmer instance
          </Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Wardrobe Light"
            placeholderTextColor="#666"
            maxLength={30}
            testID="add-device-name"
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'latch' && styles.typeButtonActive]}
              onPress={() => setType('latch')}
            >
              <Text style={[styles.typeText, type === 'latch' && styles.typeTextActive]}>
                Latch / Relay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'dimmable' && styles.typeButtonActive]}
              onPress={() => setType('dimmable')}
            >
              <Text style={[styles.typeText, type === 'dimmable' && styles.typeTextActive]}>
                Dimmable Light
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>RV-C instance (hex)</Text>
          <TextInput
            style={styles.input}
            value={instanceHex}
            onChangeText={(text) => setInstanceHex(text.replace(/[^0-9A-Fa-f]/g, '').slice(0, 2))}
            placeholder="e.g. 2C"
            placeholderTextColor="#666"
            autoCapitalize="characters"
            maxLength={2}
            testID="add-device-instance"
          />

          {preview && (
            <Text style={styles.preview}>Will send: {preview}</Text>
          )}
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { resetForm(); onClose(); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} testID="add-device-save">
              <Text style={styles.saveText}>Add Device</Text>
            </TouchableOpacity>
          </View>

          {existing.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 18 }]}>Your devices</Text>
              <FlatList
                data={existing}
                keyExtractor={(item) => item.id}
                style={styles.existingList}
                renderItem={({ item }) => (
                  <View style={styles.existingRow}>
                    <View style={styles.existingInfo}>
                      <Text style={styles.existingName}>{item.name}</Text>
                      <Text style={styles.existingMeta}>
                        {item.type === 'dimmable' ? 'Dimmable' : 'Latch'} - instance {item.instanceHex}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemove(item)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '70%',
    maxWidth: 560,
    maxHeight: '90%',
    backgroundColor: '#1B1B1B',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#999',
    fontSize: 13,
    marginBottom: 10,
  },
  label: {
    color: '#CCC',
    fontSize: 13,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    color: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  typeButtonActive: {
    backgroundColor: '#FFB267',
  },
  typeText: {
    color: '#CCC',
    fontSize: 14,
  },
  typeTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  preview: {
    color: '#7CCB7C',
    fontSize: 12,
    marginTop: 10,
    fontFamily: 'monospace',
  },
  error: {
    color: '#FF7B6B',
    fontSize: 13,
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  cancelText: {
    color: '#999',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#FFB267',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  saveText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  existingList: {
    maxHeight: 170,
  },
  existingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  existingInfo: {
    flex: 1,
  },
  existingName: {
    color: '#FFF',
    fontSize: 15,
  },
  existingMeta: {
    color: '#888',
    fontSize: 12,
  },
  removeText: {
    color: '#FF7B6B',
    fontSize: 13,
  },
});

export default AddDeviceModal;
