// context/AuthContext.js
// Holds the authentication state for the whole app. app/index.jsx shows
// the login screen until this reports an active session or demo mode.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AuthService, { DEFAULT_HOST } from '../API/AuthService';
import { VictronEnergyService } from '../API/VictronEnergyService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [permission, setPermission] = useState(null);
  const [deviceName, setDeviceName] = useState(null);
  const [serverHost, setServerHost] = useState(DEFAULT_HOST);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const session = await AuthService.restoreSession();
      if (!mounted) return;
      setServerHost(session.host);
      if (session.state === 'authenticated') {
        setPermission(session.permission);
        setDeviceName(session.deviceName);
        setIsAuthenticated(true);
        // The Victron service starts polling before the token is ready and
        // falls back to simulation on the 401 - switch it to live data now.
        VictronEnergyService.initialize().catch(() => {});
      } else if (session.state === 'demo') {
        setIsDemo(true);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (host, pin, name) => {
    const session = await AuthService.login(host, pin, name);
    setServerHost(session.host);
    setPermission(session.permission);
    setDeviceName(session.deviceName);
    setIsDemo(false);
    setIsAuthenticated(true);
    VictronEnergyService.initialize().catch(() => {});
    return session;
  }, []);

  const enterDemoMode = useCallback(async () => {
    await AuthService.enterDemoMode();
    setIsDemo(true);
    setPermission('demo');
    setDeviceName('Demo Device');
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    setIsAuthenticated(false);
    setIsDemo(false);
    setPermission(null);
    setDeviceName(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoading, isAuthenticated, isDemo, permission, deviceName, serverHost, login, enterDemoMode, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};

export default AuthContext;
