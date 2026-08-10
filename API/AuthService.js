// API/AuthService.js
// Client for the server's PIN + token authentication (see server/auth.js).
// Persists the session in AsyncStorage and configures the API clients
// (bearer token + server address) whenever a session becomes active.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, setServerHost } from './rvAPI';
import { setVictronHost, setVictronAuthToken } from './VictronAPI';

const KEYS = {
  TOKEN: '@coast_auth_token',
  PERMISSION: '@coast_auth_permission',
  DEVICE_NAME: '@coast_auth_device_name',
  HOST: '@coast_server_host',
  DEMO: '@coast_demo_mode',
};

export const DEFAULT_HOST = '192.168.8.200';
const LOGIN_TIMEOUT_MS = 8000;

const applySession = (host, token) => {
  setServerHost(host);
  setVictronHost(host);
  setAuthToken(token);
  setVictronAuthToken(token);
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const AuthService = {
  DEFAULT_HOST,

  // Pair this device with the server. Resolves with the session on
  // success, throws with a user-readable message otherwise.
  login: async (host, pin, deviceName) => {
    const cleanHost = (host || DEFAULT_HOST).trim();
    let response;
    try {
      response = await fetchWithTimeout(`http://${cleanHost}:3000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, deviceName }),
      });
    } catch (networkError) {
      throw new Error(`Could not reach the RV server at ${cleanHost}`);
    }

    let body = null;
    try {
      body = await response.json();
    } catch (_) {
      // fall through to the generic error below
    }

    if (!response.ok || !body || body.status !== 'success') {
      throw new Error((body && body.message) || `Login failed (${response.status})`);
    }

    await AsyncStorage.multiSet([
      [KEYS.TOKEN, body.token],
      [KEYS.PERMISSION, body.permission],
      [KEYS.DEVICE_NAME, body.deviceName],
      [KEYS.HOST, cleanHost],
      [KEYS.DEMO, 'false'],
    ]);

    applySession(cleanHost, body.token);
    return { permission: body.permission, deviceName: body.deviceName, host: cleanHost };
  },

  // Restore a previous session at app start.
  // Returns { state: 'authenticated' | 'demo' | 'signedOut', ... }.
  restoreSession: async () => {
    try {
      const entries = await AsyncStorage.multiGet([
        KEYS.TOKEN, KEYS.PERMISSION, KEYS.DEVICE_NAME, KEYS.HOST, KEYS.DEMO,
      ]);
      const stored = Object.fromEntries(entries);
      const token = stored[KEYS.TOKEN];
      const host = stored[KEYS.HOST] || DEFAULT_HOST;

      if (stored[KEYS.DEMO] === 'true') {
        return { state: 'demo', host };
      }
      if (!token) {
        return { state: 'signedOut', host };
      }

      applySession(host, token);

      // Check the token against the server. A network failure keeps the
      // cached session so a briefly unreachable Pi does not lock the
      // wall tablet out; an explicit 401 discards it.
      try {
        const response = await fetchWithTimeout(`http://${host}:3000/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          await AuthService.clearSession();
          return { state: 'signedOut', host };
        }
      } catch (_) {
        console.log('AuthService: server unreachable, keeping cached session');
      }

      return {
        state: 'authenticated',
        permission: stored[KEYS.PERMISSION] || 'guest',
        deviceName: stored[KEYS.DEVICE_NAME] || 'RV Device',
        host,
      };
    } catch (error) {
      console.warn('AuthService: restore failed:', error.message);
      return { state: 'signedOut', host: DEFAULT_HOST };
    }
  },

  // Demo mode runs the app without a server (all data simulated).
  enterDemoMode: async () => {
    await AsyncStorage.setItem(KEYS.DEMO, 'true');
    setAuthToken(null);
  },

  logout: async () => {
    try {
      const [[, token], [, host]] = await AsyncStorage.multiGet([KEYS.TOKEN, KEYS.HOST]);
      if (token && host) {
        // Best effort - the token also expires server-side after 24h.
        fetchWithTimeout(`http://${host}:3000/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } finally {
      await AuthService.clearSession();
    }
  },

  clearSession: async () => {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.PERMISSION, KEYS.DEVICE_NAME, KEYS.DEMO]);
    setAuthToken(null);
    setVictronAuthToken(null);
  },
};

export default AuthService;
