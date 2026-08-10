// helper/useLiveLocation.js
// Continuous GPS tracking for the RV. Asks for permission once, then keeps
// a location subscription open and reports every new fix, so the map and
// the readouts follow the RV while it is moving.
//
// Returns:
//   location  {latitude, longitude, speed, heading, altitude, accuracy, timestamp} | null
//   status    'idle' | 'requesting' | 'denied' | 'tracking' | 'error'
//   error     user-readable message when status is 'denied' or 'error'
//   refresh() force an immediate one-shot fix (used by the retry button)

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';

// A new fix every 2 seconds or every 5 metres, whichever comes first.
// Frequent enough to look live while driving without draining the tablet.
const TRACKING_OPTIONS = {
  accuracy: Location.Accuracy.High,
  timeInterval: 2000,
  distanceInterval: 5,
};

const toLocation = (fix) => ({
  latitude: fix.coords.latitude,
  longitude: fix.coords.longitude,
  speed: fix.coords.speed,          // m/s, may be null or -1 when unknown
  heading: fix.coords.heading,      // degrees, may be null or -1
  altitude: fix.coords.altitude,    // metres
  accuracy: fix.coords.accuracy,    // metres
  timestamp: fix.timestamp,
});

export const useLiveLocation = (enabled = true) => {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const subscription = useRef(null);
  const mounted = useRef(true);

  const stop = useCallback(() => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setStatus('requesting');
    setError(null);

    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (!mounted.current) return;

      if (permission !== 'granted') {
        setStatus('denied');
        setError('Location permission denied. Enable it in Settings to track the RV.');
        return;
      }

      // Show the last known position immediately so the map is not empty
      // while the first real fix is still being acquired.
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (mounted.current && lastKnown) {
        setLocation(toLocation(lastKnown));
      }

      stop();
      subscription.current = await Location.watchPositionAsync(TRACKING_OPTIONS, (fix) => {
        if (!mounted.current) return;
        setLocation(toLocation(fix));
        setStatus('tracking');
        setError(null);
      });

      if (mounted.current) setStatus('tracking');
    } catch (locationError) {
      if (!mounted.current) return;
      setStatus('error');
      setError(locationError.message || 'Could not start location tracking');
    }
  }, [stop]);

  const refresh = useCallback(async () => {
    try {
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (mounted.current) {
        setLocation(toLocation(fix));
        setStatus('tracking');
        setError(null);
      }
    } catch (refreshError) {
      // A failed manual refresh should not tear down an active subscription.
      if (mounted.current && !subscription.current) {
        setStatus('error');
        setError(refreshError.message || 'Could not get a location fix');
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    if (enabled) {
      start();
    } else {
      stop();
      setStatus('idle');
    }

    return () => {
      mounted.current = false;
      stop();
    };
  }, [enabled, start, stop]);

  return { location, status, error, refresh, retry: start };
};

export default useLiveLocation;
