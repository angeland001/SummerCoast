// screens/LightScreenTablet.jsx - Updated with removed scenes and separate master control
import React, { useState, useEffect } from "react";
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import moment from "moment";
import SimpleHoldToDimLight from "../components/SimpleHoldToDimLight.jsx";
import { LightControlService } from "../Service/LightControlService.js";
import { CANBusMonitor } from "../Service/CANBusMonitor.js";
import rvStateManager from "../API/RVStateManager/RVStateManager";
import { handleAllLightsOn, handleAllLightsOff, getLightDisplayName, getLightGroups, showStatusMessage } from "../helper";

const ImprovedLightScreenTablet = () => {
  // Current date/time
  const currentDate = moment().format("MMMM Do, YYYY");
  const dayOfTheWeek = moment().format("dddd");

  // State for loading and operations
  const [isLoading, setIsLoading] = useState(false);
  const [activeDimmingLights, setActiveDimmingLights] = useState(new Set());

  // State for master light switch - independent from individual lights
  const [masterLightOn, setMasterLightOn] = useState(false);

  // Status messages
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);

  // Get all available lights
  const allLights = LightControlService.getAllLights();

  // Check if dimming is supported
  const supportsDimming = LightControlService.supportsDimming();

  // Individual light states from RV State Manager
  const [lightStates, setLightStates] = useState({});
  const [lightBrightness, setLightBrightness] = useState({});

  // Subscribe to RV State Manager for light states (but don't affect master)
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribe(({ category, state }) => {
      if (category === 'lights') {
        const currentLights = state.lights || {};
        const newLightStates = {};
        const newLightBrightness = {};

        Object.entries(currentLights).forEach(([lightId, lightState]) => {
          newLightStates[lightId] = lightState.isOn;
          newLightBrightness[lightId] = lightState.brightness || 0;
        });

        setLightStates(newLightStates);
        setLightBrightness(newLightBrightness);

        // Master state is now independent - don't update based on individual lights
      }
    });

    // Initialize light states on component mount
    const currentLights = rvStateManager.getCategoryState('lights');
    const initialLightStates = {};
    const initialLightBrightness = {};

    Object.entries(currentLights).forEach(([lightId, lightState]) => {
      initialLightStates[lightId] = lightState ? lightState.isOn : false;
      initialLightBrightness[lightId] = lightState ? lightState.brightness || 0 : 0;
    });

    setLightStates(initialLightStates);
    setLightBrightness(initialLightBrightness);

    return unsubscribe;
  }, []);

  // Subscribe to CAN bus updates
  useEffect(() => {
    const subscription = CANBusMonitor.subscribeToDimmingUpdates((updates) => {
      Object.entries(updates).forEach(([lightId, updateData]) => {
        const brightness = updateData.brightness || 0;
        const isOn = updateData.isOn || brightness > 0;

        // Update RV State Manager
        rvStateManager.updateLightState(lightId, isOn, brightness);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  // Turn all lights on
  const handleAllLightsOnPress = async () => {
    const success = await handleAllLightsOn(
      allLights,
      setIsLoading,
      (message) => showStatusMessage(message, setStatusMessage, setShowStatus)
    );
    if (success) {
      setMasterLightOn(true);
    }
  };

  // Turn all lights off
  const handleAllLightsOffPress = async () => {
    const success = await handleAllLightsOff(
      allLights,
      activeDimmingLights,
      setActiveDimmingLights,
      setIsLoading,
      (message) => showStatusMessage(message, setStatusMessage, setShowStatus)
    );
    if (success) {
      setMasterLightOn(false);
    }
  };

  // Group lights by category
  const lightGroups = getLightGroups();

  const roomColumns = [
    { title: "Kitchen & Living Area", lights: lightGroups.kitchen },
    { title: "Bedroom", lights: lightGroups.bedroom },
    { title: "Bathroom", lights: lightGroups.bathroom },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text className="text-3xl text-white">{dayOfTheWeek}</Text>
          <Text className="text-lg text-white">{currentDate}</Text>
        </View>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
        />
      </View>

      {/* Status message overlay */}
      {showStatus && (
        <View style={styles.statusOverlay}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}

      {/* Master Light Control */}
      <View style={styles.masterRow}>
        <View style={styles.masterCard}>
          <View style={styles.masterLeft}>
            <Image
              source={require("../assets/lamplight.png")}
              style={styles.masterIcon}
            />
            <Text className="text-white">Light Master</Text>
            <Text style={styles.masterHint}>Hold-to-Dim Mode</Text>
          </View>

          {/* Master ON/OFF buttons with even spacing */}
          <View style={styles.masterButtons}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFB267" />
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.masterButton,
                    styles.masterButtonLeft,
                    { backgroundColor: masterLightOn ? '#FFB267' : '#444' },
                  ]}
                  onPress={handleAllLightsOnPress}
                  disabled={isLoading}
                >
                  <Text style={[styles.masterButtonText, { color: masterLightOn ? '#000' : '#FFF' }]}>ON</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.masterButton,
                    styles.masterButtonRight,
                    { backgroundColor: !masterLightOn ? '#FFB267' : '#444' },
                  ]}
                  onPress={handleAllLightsOffPress}
                  disabled={isLoading}
                >
                  <Text style={[styles.masterButtonText, { color: !masterLightOn ? '#000' : '#FFF' }]}>OFF</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Room columns */}
      <View style={styles.columnsRow}>
        {roomColumns.map(({ title, lights }) => (
          <View key={title} style={styles.roomCard}>
            <Text style={styles.roomTitle}>{title}</Text>
            <View style={styles.divider} />
            <ScrollView>
              {lights.map((lightId) => (
                <SimpleHoldToDimLight
                  key={lightId}
                  name={getLightDisplayName(lightId)}
                  lightId={lightId}
                  value={lightBrightness[lightId] || 0}
                  isOn={lightStates[lightId] || false}
                  supportsDimming={supportsDimming}
                />
              ))}
            </ScrollView>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 70,
    height: 45,
    backgroundColor: "white",
  },
  statusOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 10,
    zIndex: 1000,
    width: 300,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 16,
  },
  masterRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  masterCard: {
    width: "60%",
    maxWidth: 700,
    backgroundColor: "#1B1B1B",
    borderRadius: 10,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  masterLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  masterIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    marginRight: 10,
  },
  masterHint: {
    color: '#FFB267',
    fontSize: 12,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  masterButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  masterButtonLeft: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    marginRight: 1,
  },
  masterButtonRight: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  masterButtonText: {
    fontWeight: 'bold',
  },
  columnsRow: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
  },
  roomCard: {
    flex: 1,
    backgroundColor: "#1B1B1B",
    borderRadius: 10,
    padding: 16,
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 6,
  },
  roomTitle: {
    color: "white",
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "white",
    marginTop: 8,
    marginBottom: 10,
  },
});

export default ImprovedLightScreenTablet;
