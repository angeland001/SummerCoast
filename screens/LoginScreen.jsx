// screens/LoginScreen.jsx
// Device pairing screen. The user enters the RV's PIN (owner or guest,
// configured on the Pi in server/auth-config.json) and a name for this
// device. Advanced lets them change the server address; Demo Mode runs
// the app with simulated data and no server.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../helper/useResponsive';

const LoginScreen = () => {
  const { login, enterDemoMode, serverHost } = useAuth();
  const { isPhone } = useResponsive();

  const [pin, setPin] = useState('');
  const [deviceName, setDeviceName] = useState('RV Tablet');
  const [host, setHost] = useState(serverHost);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleConnect = async () => {
    if (busy) return;
    setError(null);

    if (!pin.trim()) {
      setError('Enter the RV PIN');
      return;
    }
    if (!deviceName.trim()) {
      setError('Enter a name for this device');
      return;
    }

    setBusy(true);
    try {
      await login(host, pin.trim(), deviceName.trim());
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.card, isPhone && styles.cardPhone]}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>CoastRV</Text>
        <Text style={styles.subtitle}>Pair this device with your RV</Text>

        <Text style={styles.label}>RV PIN</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="Enter PIN"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          testID="login-pin"
        />

        <Text style={styles.label}>Device name</Text>
        <TextInput
          style={styles.input}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="e.g. Kitchen Tablet"
          placeholderTextColor="#666"
          maxLength={40}
          testID="login-device-name"
        />

        {showAdvanced && (
          <>
            <Text style={styles.label}>Server address</Text>
            <TextInput
              style={styles.input}
              value={host}
              onChangeText={setHost}
              placeholder="192.168.8.200"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              testID="login-host"
            />
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.connectButton, busy && styles.connectButtonBusy]}
          onPress={handleConnect}
          disabled={busy}
          testID="login-connect"
        >
          {busy ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.connectText}>Connect</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <TouchableOpacity onPress={() => setShowAdvanced(!showAdvanced)}>
            <Text style={styles.footerLink}>
              {showAdvanced ? 'Hide advanced' : 'Advanced'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={enterDemoMode} testID="login-demo">
            <Text style={styles.footerLink}>Demo mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '55%',
    maxWidth: 520,
    backgroundColor: '#1B1B1B',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  cardPhone: {
    width: '100%',
  },
  logo: {
    width: 84,
    height: 54,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  title: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 20,
  },
  label: {
    color: '#CCC',
    fontSize: 13,
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    width: '100%',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    color: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: '#FF7B6B',
    fontSize: 14,
    marginTop: 14,
    textAlign: 'center',
  },
  connectButton: {
    width: '100%',
    backgroundColor: '#FFB267',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  connectButtonBusy: {
    opacity: 0.7,
  },
  connectText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
  },
  footerLink: {
    color: '#FFB267',
    fontSize: 13,
  },
});

export default LoginScreen;
