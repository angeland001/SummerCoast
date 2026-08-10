// components/Map.jsx
// Dashboard map tile. Follows the RV live and shows a short status line;
// tapping it opens the full-screen live location view.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useResponsive } from '../helper/useResponsive';
import { useLiveLocation } from '../helper/useLiveLocation';
import { darkMapStyle } from './mapStyle';
import { formatSpeed, isMoving } from '../helper/locationFormat';
import LiveGPSModal from './LiveGPSModal';

// The hosting layouts do not give this tile a height, so it carries its
// own size, scaled per device instead of the old two hardcoded values.
const TILE_SIZE = {
  phone: { width: 320, height: 180 },
  smallTablet: { width: 240, height: 200 },
  largeTablet: { width: 330, height: 260 },
};

const Map = ({ width, height }) => {
  const { device } = useResponsive();
  const [detailVisible, setDetailVisible] = useState(false);
  const { location, status } = useLiveLocation(true);

  const size = TILE_SIZE[device] || TILE_SIZE.phone;
  const tileWidth = width || size.width;
  const tileHeight = height || size.height;

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
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setDetailVisible(true)}
        style={[styles.tile, { width: tileWidth, height: tileHeight }]}
        testID="map-tile"
      >
        {location ? (
          <MapView
            style={StyleSheet.absoluteFill}
            customMapStyle={darkMapStyle}
            region={region}
            showsUserLocation
            // The tile is a tap target for the detail view, so the map
            // itself should not swallow the touch.
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            legalLabelInsets={{ bottom: -100, right: -100 }}
          >
            <Marker
              coordinate={{ latitude: location.latitude, longitude: location.longitude }}
              title="RV location"
            />
          </MapView>
        ) : (
          <View style={styles.placeholder}>
            {status === 'requesting' ? (
              <ActivityIndicator color="#FFB267" />
            ) : (
              <Text style={styles.placeholderText}>
                {status === 'denied' ? 'Location off' : 'No GPS fix'}
              </Text>
            )}
          </View>
        )}

        <View style={styles.badge}>
          <View
            style={[
              styles.dot,
              status === 'tracking' && location ? styles.dotLive : styles.dotOffline,
            ]}
          />
          <Text style={styles.badgeText}>
            {status !== 'tracking'
              ? 'GPS off'
              : !location
              ? 'Acquiring...'
              : moving
              ? formatSpeed(location.speed)
              : 'Parked'}
          </Text>
        </View>
      </TouchableOpacity>

      <LiveGPSModal isVisible={detailVisible} onClose={() => setDetailVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  tile: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1B1B1B',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#777',
    fontSize: 13,
  },
  badge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotLive: {
    backgroundColor: '#4CAF50',
  },
  dotOffline: {
    backgroundColor: '#FF7B6B',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
  },
});

export default Map;
