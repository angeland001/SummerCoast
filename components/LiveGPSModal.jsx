// components/LiveGPSModal.jsx
// Full-screen live location view: the map fills the space and a panel
// beside it shows the current fix in detail. Opened by tapping the map
// tile on the dashboard.

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useResponsive } from '../helper/useResponsive';
import { useLiveLocation } from '../helper/useLiveLocation';
import { darkMapStyle } from './mapStyle';
import {
  formatLatitude,
  formatLongitude,
  formatSpeed,
  formatAltitude,
  formatAccuracy,
  formatHeading,
  formatFixAge,
  isMoving,
} from '../helper/locationFormat';

const Readout = ({ label, value, highlight }) => (
  <View style={styles.readout}>
    <Text style={styles.readoutLabel}>{label}</Text>
    <Text style={[styles.readoutValue, highlight && styles.readoutValueHighlight]}>{value}</Text>
  </View>
);

const LiveGPSModal = ({ isVisible, onClose }) => {
  const { isPhone } = useResponsive();
  // Only track while the modal is open so the subscription stops on close.
  const { location, status, error, refresh, retry } = useLiveLocation(isVisible);

  const region = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : undefined;

  const moving = location && isMoving(location.speed);

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Live Location</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  status === 'tracking' && location ? styles.dotLive : styles.dotOffline,
                ]}
              />
              <Text style={styles.statusText}>
                {status === 'tracking'
                  ? !location
                    ? 'Waiting for first fix...'
                    : moving
                    ? 'Tracking - moving'
                    : 'Tracking - parked'
                  : status === 'requesting'
                  ? 'Getting location...'
                  : status === 'denied'
                  ? 'Permission denied'
                  : status === 'error'
                  ? 'Location unavailable'
                  : 'Idle'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} testID="gps-close">
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={[styles.body, isPhone && styles.bodyPhone]}>
          <View style={styles.mapWrapper}>
            {location ? (
              <MapView
                style={styles.map}
                customMapStyle={darkMapStyle}
                region={region}
                showsUserLocation
                showsCompass
                showsScale
              >
                <Marker
                  coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                  title="RV location"
                  description={moving ? formatSpeed(location.speed) : 'Parked'}
                />
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                {status === 'requesting' ? (
                  <>
                    <ActivityIndicator size="large" color="#FFB267" />
                    <Text style={styles.placeholderText}>Acquiring GPS fix...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="location-outline" size={48} color="#666" />
                    <Text style={styles.placeholderText}>
                      {error || 'No location yet'}
                    </Text>
                    <TouchableOpacity style={styles.retryButton} onPress={retry}>
                      <Text style={styles.retryText}>Try again</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>

          <View style={[styles.panel, isPhone && styles.panelPhone]}>
            <Readout label="Latitude" value={formatLatitude(location?.latitude)} />
            <Readout label="Longitude" value={formatLongitude(location?.longitude)} />
            <Readout label="Speed" value={formatSpeed(location?.speed)} highlight={moving} />
            <Readout label="Heading" value={formatHeading(location?.heading)} />
            <Readout label="Altitude" value={formatAltitude(location?.altitude)} />
            <Readout label="GPS accuracy" value={formatAccuracy(location?.accuracy)} />
            <Readout label="Last fix" value={formatFixAge(location?.timestamp)} />

            <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
              <Ionicons name="refresh" size={18} color="#000" />
              <Text style={styles.refreshText}>Refresh now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotLive: {
    backgroundColor: '#4CAF50',
  },
  dotOffline: {
    backgroundColor: '#FF7B6B',
  },
  statusText: {
    color: '#AAA',
    fontSize: 13,
  },
  closeButton: {
    padding: 8,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  bodyPhone: {
    flexDirection: 'column',
  },
  mapWrapper: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1B1B1B',
    minHeight: 200,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#FFB267',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: {
    color: '#000',
    fontWeight: '700',
  },
  panel: {
    flex: 1,
    backgroundColor: '#1B1B1B',
    borderRadius: 14,
    padding: 18,
    justifyContent: 'center',
  },
  panelPhone: {
    flex: 0,
  },
  readout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  readoutLabel: {
    color: '#999',
    fontSize: 13,
  },
  readoutValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  readoutValueHighlight: {
    color: '#4CAF50',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFB267',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 18,
  },
  refreshText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default LiveGPSModal;
