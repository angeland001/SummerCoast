import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Pressable, TouchableOpacity, Image, ScrollView, Modal, Button, ActivityIndicator } from "react-native";
import SimpleHoldToDimLight from "../components/SimpleHoldToDimLight.jsx";

import useScreenSize from "../helper/useScreenSize.jsx";
import AwningControlModal from "../components/AwningControlModal";
import HeaterControlModal from "../components/HeaterControlModal";
import { LightService, FanService, WaterService } from "../API/RVControlServices"; 
import MasterLightControl from "../components/MasterLightControl.jsx";
import { Feather as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Ionicons from '@expo/vector-icons/Ionicons';

// Import RV State Management hooks
import { useRVLights, useRVWater } from "../API/RVStateManager/RVStateHooks";
import rvStateManager from "../API/RVStateManager/RVStateManager";
import { LightControlService } from "../Service/LightControlService.js";
import AddDeviceModal from "../components/AddDeviceModal.jsx";
import CustomDeviceRow from "../components/CustomDeviceRow.jsx";
import CustomDeviceStore from "../Service/CustomDeviceStore.js";
import { useAuth } from "../context/AuthContext";

import {
  Padding,
  Border,
  Color,
  FontFamily,
  FontSize,
} from "../GlobalStyles";

const TABS = {
  MAIN: "Main",
  BEDROOM: "Bedroom",
  BATHROOM: "Bathroom",
};

// Light IDs to display names mapping
const lightDisplayNames = {
  'kitchen_lights': 'Kitchen Light',
  'bath_light': 'Bathroom Light',
  'bed_ovhd_light': 'Bed Light',
  'vibe_light': 'Accent Light',
  'vanity_light': 'Vanity Light',
  'awning_lights': 'Awning Lights',
  'shower_lights': 'Shower Light',
  'under_cab_lights': 'Cabinet Light',
  'hitch_lights': 'Hitch Light',
  'porch_lights': 'Porch Light', 
  'left_reading_lights': 'Left Reading Light',
  'right_reading_lights': 'Right Reading Light',
  'dinette_lights': 'Dining Light',
  'strip_lights': 'Strip Light',
  'wardrobe_lights': 'Wardrobe Light'
};

// Light groups by category - Updated to match LightScreenTablet structure
const lightGroups = {
  main: [
    'kitchen_lights',
    'dinette_lights', 
    'under_cab_lights',
    'strip_lights',
    'awning_lights',
    'porch_lights',
    'hitch_lights'
  ],
  bedroom: [
    'bed_ovhd_light',
    'left_reading_lights',
    'right_reading_lights',
    'vibe_light'
  ],
  bathroom: [
    'bath_light',
    'vanity_light',
    'shower_lights'
  ]
};

const Devices = () => {
  const [isOn, setIsOn] = useState(false);
  const isTablet = useScreenSize();
  const [selectedTab, setSelectedTab] = useState(TABS.MAIN);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isHeaterModalVisible, setHeaterModalVisible] = useState(false);
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [isAddDeviceVisible, setAddDeviceVisible] = useState(false);
  const [customDevices, setCustomDevices] = useState([]);
  const { deviceName } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Use RV State Management hooks
  const { lights, toggleLight, setLightBrightness: updateLightBrightness, turnAllLightsOn, turnAllLightsOff } = useRVLights();
  const { water, toggleWaterPump, toggleWaterHeater } = useRVWater();
  
  // Fan control states (these could be moved to RV state manager too)
  const [isBathroomFanOn, setBathroomFanOn] = useState(false);
  const [isBayVentFanOn, setBayVentFanOn] = useState(false);
  
  // State for API operation status
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);

  // State for individual light states - now managed by RV state manager
  const [lightStates, setLightStates] = useState({});
  const [localLightBrightness, setLocalLightBrightness] = useState({});
  
  // State for master light switch - independent from individual lights
  const [masterLightOn, setMasterLightOn] = useState(false);

  // Get all available lights
  const allLights = LightControlService.getAllLights();
  
  // Check if dimming is supported
  const supportsDimming = LightControlService.supportsDimming();

  // Initialize light states from RV state manager
  useEffect(() => {
    const initializeState = async () => {
      try {
        // Get current light state from RV state manager
        const currentLightState = rvStateManager.getCategoryState('lights');
        const currentWaterState = rvStateManager.getCategoryState('water');
        
        // Combine all light groups to get all lights
        const allLights = [
          ...lightGroups.main,
          ...lightGroups.bedroom,
          ...lightGroups.bathroom
        ];
        
        // Remove duplicates
        const uniqueLights = [...new Set(allLights)];
        
        // Initialize from RV state manager or set defaults
        const initialLightStates = {};
        const initialLightBrightness = {};
        
        uniqueLights.forEach(lightId => {
          if (currentLightState[lightId]) {
            initialLightStates[lightId] = currentLightState[lightId].isOn || false;
            initialLightBrightness[lightId] = currentLightState[lightId].brightness || 50;
          } else {
            initialLightStates[lightId] = false;
            initialLightBrightness[lightId] = 50;
            // Initialize in RV state manager
            rvStateManager.updateLightState(lightId, false, 50);
          }
        });
        
        setLightStates(initialLightStates);
        setLocalLightBrightness(initialLightBrightness);
        
        // Set master light state based on any lights being on
        const anyLightOn = Object.values(initialLightStates).some(state => state);
        setMasterLightOn(anyLightOn);
        
        // Fall back to AsyncStorage for backwards compatibility and sync to RV state
        try {
          const savedLightStates = await AsyncStorage.getItem('lightStates');
          const savedSliderValues = await AsyncStorage.getItem('sliderValues');
          
          if (savedLightStates) {
            const savedStates = JSON.parse(savedLightStates);
            // Update RV state manager with saved states
            Object.entries(savedStates).forEach(([lightId, isOn]) => {
              const brightness = initialLightBrightness[lightId] || 50;
              rvStateManager.updateLightState(lightId, isOn, brightness);
            });
            setLightStates(savedStates);
          }
          
          if (savedSliderValues) {
            const savedValues = JSON.parse(savedSliderValues);
            // Update RV state manager with saved values
            Object.entries(savedValues).forEach(([lightId, brightness]) => {
              const isOn = initialLightStates[lightId] || false;
              rvStateManager.updateLightState(lightId, isOn, brightness);
            });
            setLocalLightBrightness(savedValues);
          }
        } catch (error) {
          console.error('Error loading saved light states from AsyncStorage:', error);
        }
        
      } catch (error) {
        console.error('Error initializing Devices state:', error);
      }
    };
    
    initializeState();
  }, []);

  // Subscribe to RV State Manager for light states
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
        setLocalLightBrightness(newLightBrightness);
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
    setLocalLightBrightness(initialLightBrightness);

    return unsubscribe;
  }, []);

  // Subscribe to external state changes from RV state manager
  useEffect(() => {
    const unsubscribe = rvStateManager.subscribeToExternalChanges((newState) => {
      if (newState.lights) {
        // Update local state when external light changes occur
        const updatedLightStates = {};
        const updatedLightBrightness = {};
        let hasChanges = false;
        
        Object.entries(newState.lights).forEach(([lightId, lightData]) => {
          if (lightData.isOn !== lightStates[lightId] || lightData.brightness !== localLightBrightness[lightId]) {
            updatedLightStates[lightId] = lightData.isOn;
            updatedLightBrightness[lightId] = lightData.brightness;
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          setLightStates(prev => ({ ...prev, ...updatedLightStates }));
          setLocalLightBrightness(prev => ({ ...prev, ...updatedLightBrightness }));
          
          // Show notification of external change
          const changedLights = Object.keys(updatedLightStates);
          if (changedLights.length === 1) {
            const lightName = lightDisplayNames[changedLights[0]] || changedLights[0];
            setStatusMessage(`${lightName} ${updatedLightStates[changedLights[0]] ? 'turned on' : 'turned off'} remotely`);
          } else if (changedLights.length > 1) {
            setStatusMessage(`${changedLights.length} lights changed remotely`);
          }
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
      
      if (newState.water) {
        // Update water system states from external changes
        if (newState.water.pumpOn !== undefined) {
          setStatusMessage(`Water pump ${newState.water.pumpOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
        
        if (newState.water.heaterOn !== undefined) {
          setStatusMessage(`Water heater ${newState.water.heaterOn ? 'turned on' : 'turned off'} remotely`);
          setShowStatus(true);
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    });
    
    return unsubscribe;
  }, [lightStates, localLightBrightness]);

  // Sync light states to AsyncStorage when they change (backwards compatibility)
  useEffect(() => {
    const saveLightStates = async () => {
      try {
        await AsyncStorage.setItem('lightStates', JSON.stringify(lightStates));
        await AsyncStorage.setItem('sliderValues', JSON.stringify(localLightBrightness));
      } catch (error) {
        console.error('Error saving light states:', error);
      }
    };
    
    // Only save if states have been initialized (not empty objects)
    if (Object.keys(lightStates).length > 0) {
      saveLightStates();
    }
  }, [lightStates, localLightBrightness]);

  // Show status message helper
  const showStatusMessage = (message, duration = 3000) => {
    setStatusMessage(message);
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), duration);
  };

  // Keep the custom device list in sync with the store
  useEffect(() => {
    const unsubscribe = CustomDeviceStore.subscribe(setCustomDevices);
    return unsubscribe;
  }, []);

  // Handle bathroom fan toggle with API integration
  const toggleBathroomFan = async () => {
    try {
      setIsLoading(true);
      const newState = !isBathroomFanOn;
      
      // Update state first for immediate UI feedback
      setBathroomFanOn(newState);
      
      const result = await FanService.toggleBathroomFan();
      
      if (result.success) {
        // Show status message
        setStatusMessage(`Bathroom fan ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        console.error('Failed to toggle bathroom fan:', result.error);
        
        // Revert state on error
        setBathroomFanOn(!newState);
        
        // Show error message
        setStatusMessage('Failed to toggle bathroom fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling bathroom fan:', error);
      
      // Revert state on error
      setBathroomFanOn(!isBathroomFanOn);
      
      // Show error message
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle bay vent fan toggle with API integration
  const toggleBayVentFan = async () => {
    try {
      setIsLoading(true);
      const newState = !isBayVentFanOn;
      
      // Update state first for immediate UI feedback
      setBayVentFanOn(newState);
      
      const result = await FanService.toggleBayVentFan();
      
      if (result.success) {
        // Show status message
        setStatusMessage(`Bay vent fan ${newState ? 'turned on' : 'turned off'}`);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      } else {
        console.error('Failed to toggle bay vent fan:', result.error);
        
        // Revert state on error
        setBayVentFanOn(!newState);
        
        // Show error message
        setStatusMessage('Failed to toggle bay vent fan');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling bay vent fan:', error);
      
      // Revert state on error
      setBayVentFanOn(!isBayVentFanOn);
      
      // Show error message
      setStatusMessage(`Error: ${error.message}`);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Water heater toggle with RV state management
  const handleWaterHeaterToggle = async () => {
    setIsLoading(true);
    const newState = !water.heaterOn;
    
    try {
      // Update RV state first for immediate UI feedback
      rvStateManager.updateWaterState({ 
        heaterOn: newState,
        lastUpdated: new Date().toISOString()
      });
      
      const result = await WaterService.toggleWaterHeater();
      if (result.success) {
        setStatusMessage(`Water heater ${newState ? 'turned on' : 'turned off'}`);
      } else {
        // Revert state on error
        rvStateManager.updateWaterState({ 
          heaterOn: !newState,
          lastUpdated: new Date().toISOString()
        });
        setStatusMessage('Failed to toggle water heater');
      }
    } catch (e) {
      // Revert state on error
      rvStateManager.updateWaterState({ 
        heaterOn: !newState,
        lastUpdated: new Date().toISOString()
      });
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      setIsLoading(false);
    }
  };

  // Water pump toggle with RV state management
  const handleWaterPumpToggle = async () => {
    setIsLoading(true);
    const newState = !water.pumpOn;
    
    try {
      // Update RV state first for immediate UI feedback
      rvStateManager.updateWaterState({ 
        pumpOn: newState,
        lastUpdated: new Date().toISOString()
      });
      
      const result = await WaterService.toggleWaterPump();
      if (result.success) {
        setStatusMessage(`Water pump ${newState ? 'turned on' : 'turned off'}`);
      } else {
        // Revert state on error
        rvStateManager.updateWaterState({ 
          pumpOn: !newState,
          lastUpdated: new Date().toISOString()
        });
        setStatusMessage('Failed to toggle water pump');
      }
    } catch (e) {
      // Revert state on error
      rvStateManager.updateWaterState({ 
        pumpOn: !newState,
        lastUpdated: new Date().toISOString()
      });
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
      setIsLoading(false);
    }
  };

  // Master light toggle handler - updated to use LightControlService like LightScreenTablet
  const handleMasterLightToggle = async (isOn) => {
    try {
      setIsLoading(true);
      console.log(`Master light toggle called with isOn=${isOn}`);
      
      if (isOn) {
        // Turn on all lights using LightControlService
        const result = await LightControlService.allLightsOn();
        
        if (result.success) {
          // Update RV state manager for all lights
          allLights.forEach(lightId => {
            rvStateManager.updateLightState(lightId, true, 75); // Default to 75% brightness
          });
          
          setMasterLightOn(true);
          showStatusMessage('All lights turned ON');
        } else {
          showStatusMessage('Failed to turn all lights ON');
        }
      } else {
        // Turn off all lights using LightControlService
        const result = await LightControlService.allLightsOff();
        
        if (result.success) {
          // Update RV state manager for all lights
          allLights.forEach(lightId => {
            rvStateManager.updateLightState(lightId, false, 0);
          });
          
          setMasterLightOn(false);
          showStatusMessage('All lights turned OFF');
        } else {
          showStatusMessage('Failed to turn all lights OFF');
        }
      }
    } catch (error) {
      showStatusMessage(`Error: ${error.message}`);
      console.error('Error controlling master lights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    if (selectedTab === TABS.MAIN) {
      return (
        <>
          <View className="flex-row items-center justify-between mx-16 h-28">
            <View className="items-center bg-brown-300 ">
              <Pressable onPress={() => setModalVisible(true)}>
                <Image
                  source={require("../assets/abpost61724photoroom-3.png")}
                  className="h-20 w-24 mb-1"
                />
              </Pressable>
              <Text className="text-white text-base">
                Awning Controls
              </Text>
            </View>
          
            <View className="items-center">
              <Pressable onPress={() => setHeaterModalVisible(true)}>
                <Image
                  source={require("../assets/image-21.png")}
                  contentFit="cover"
                />
              </Pressable>
              <Text className="text-white text-base">
                Toe Kick Heater
              </Text>
            </View>
          </View>
          
          {/* Master Light Toggle */}
          <MasterLightControl 
            isOn={masterLightOn}
            onToggleOn={async () => {
              await handleMasterLightToggle(true);
            }}
            onToggleOff={async () => {
              await handleMasterLightToggle(false);
            }}
            isLoading={isLoading}
          />
          
          <View style={styles.divider} />
          
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 80 }}
            style={{ marginHorizontal: 20 }}
          >
            {lightGroups.main.map((lightId) => (
              <SimpleHoldToDimLight
                key={lightId}
                name={lightDisplayNames[lightId] || lightId}
                lightId={lightId}
                value={localLightBrightness[lightId] || 0}
                isOn={lightStates[lightId] || false}
                supportsDimming={supportsDimming}
              />
            ))}

            {customDevices.length > 0 && (
              <>
                <Text style={styles.customDevicesTitle}>Custom Devices</Text>
                {customDevices.map((device) => (
                  <CustomDeviceRow
                    key={device.id}
                    device={device}
                    onStatus={showStatusMessage}
                  />
                ))}
              </>
            )}
          </ScrollView>
        </>
      );
    } else if (selectedTab === TABS.BEDROOM) {
      return (
        <>
        {/* ───── Water Controls (Bedroom Tab) ───── */}
         <View style={styles.fanControlsContainer}>
            <TouchableOpacity
              style={[
                styles.waterControlButton,
                water.heaterOn
                  ? styles.waterControlButtonActive
                  : styles.waterControlButtonInactive,
                isLoading && styles.disabledButton,
              ]}
              onPress={handleWaterHeaterToggle}
              disabled={isLoading}
            >
             <View style={styles.fanIconContainer}>
              <View
                style={[
                  styles.fanIconCircle,
                  water.heaterOn
                    ? styles.waterIconCircleActive
                    : styles.waterIconCircleInactive,
                ]}
              >
                <Ionicons
                  name={water.heaterOn ? 'water' : 'water-outline'}
                  size={24}
                  color={water.heaterOn ? '#FFF' : '#888'}
                />
              </View>
             </View>

             <Text style={styles.fanButtonLabel}>Water Heater</Text>
             <View style={[styles.statusIndicator, water.heaterOn ? styles.statusActive : styles.statusInactive]}>
               <Text style={styles.statusText}>{water.heaterOn ? 'ON' : 'OFF'}</Text>
             </View>
           </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.waterControlButton,
                water.pumpOn
                  ? styles.waterControlButtonActive
                  : styles.waterControlButtonInactive,
                isLoading && styles.disabledButton,
              ]}
              onPress={handleWaterPumpToggle}
              disabled={isLoading}
            >
             <View style={styles.fanIconContainer}>
               <View style={[
                 styles.fanIconCircle,
                 water.pumpOn
                   ? styles.waterIconCircleActive
                   : styles.waterIconCircleInactive
               ]}>
                 <Ionicons
                   name={water.pumpOn ? 'pie-chart' : 'pie-chart-outline'}
                   size={24}
                   color={water.pumpOn ? '#FFF' : '#888'}
                 />
               </View>
             </View>
             <Text style={styles.fanButtonLabel}>Water Pump</Text>
             <View style={[styles.statusIndicator, water.pumpOn ? styles.statusActive : styles.statusInactive]}>
               <Text style={styles.statusText}>{water.pumpOn ? 'ON' : 'OFF'}</Text>
             </View>
            </TouchableOpacity>
         </View>
         
         <MasterLightControl 
            isOn={masterLightOn}
            onToggleOn={async () => {
              await handleMasterLightToggle(true);
            }}
            onToggleOff={async () => {
              await handleMasterLightToggle(false);
            }}
            isLoading={isLoading}
          />
          
          <View style={styles.divider} />
          
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 80 }}
            style={{ marginHorizontal: 20 }}
          >
            {lightGroups.bedroom.map((lightId) => (
              <SimpleHoldToDimLight
                key={lightId}
                name={lightDisplayNames[lightId] || lightId}
                lightId={lightId}
                value={localLightBrightness[lightId] || 0}
                isOn={lightStates[lightId] || false}
                supportsDimming={supportsDimming}
              />
            ))}
          </ScrollView>
        </>
      );
    } else if (selectedTab === TABS.BATHROOM) {
      return (
        <View className="">
          {/* Modern Fan Controls */}
          <View style={styles.fanControlsContainer}>
            <TouchableOpacity
              style={[
                styles.modernFanButton,
                isBayVentFanOn ? styles.fanButtonActive : styles.fanButtonInactive,
                isLoading && styles.disabledButton
              ]}
              onPress={toggleBayVentFan}
              disabled={isLoading}
            >
              <View style={styles.fanIconContainer}>
                <View style={[styles.fanIconCircle, isBayVentFanOn ? styles.iconCircleActive : styles.iconCircleInactive]}>
                  <Icon name="sun" size={24} color={isBayVentFanOn ? "#FFF" : "#888"} />
                </View>
              </View>
              <Text style={styles.fanButtonLabel}>Bay Vent</Text>
              <View style={[styles.statusIndicator, isBayVentFanOn ? styles.statusActive : styles.statusInactive]}>
                <Text style={styles.statusText}>{isBayVentFanOn ? "ON" : "OFF"}</Text>
              </View>
            </TouchableOpacity>
          
            <TouchableOpacity
              style={[
                styles.modernFanButton,
                isBathroomFanOn ? styles.fanButtonActive : styles.fanButtonInactive,
                isLoading && styles.disabledButton
              ]}
              onPress={toggleBathroomFan}
              disabled={isLoading}
            >
              <View style={styles.fanIconContainer}>
                <View style={[styles.fanIconCircle, isBathroomFanOn ? styles.iconCircleActive : styles.iconCircleInactive]}>
                  <Icon name="wind" size={24} color={isBathroomFanOn ? "#FFF" : "#888"} />
                </View>
              </View>
              <Text style={styles.fanButtonLabel}>Bath Fan</Text>
              <View style={[styles.statusIndicator, isBathroomFanOn ? styles.statusActive : styles.statusInactive]}>
                <Text style={styles.statusText}>{isBathroomFanOn ? "ON" : "OFF"}</Text>
              </View>
            </TouchableOpacity>
          </View>
    
          {/* Light Master Control */}
          <MasterLightControl 
            isOn={masterLightOn}
            onToggleOn={async () => {
              await handleMasterLightToggle(true);
            }}
            onToggleOff={async () => {
              await handleMasterLightToggle(false);
            }}
            isLoading={isLoading}
          />
    
          {/* Divider */}
          <View style={styles.divider} />
    
          {/* Light Controls with SimpleHoldToDimLight */}
          <ScrollView 
            contentContainerStyle={{ paddingBottom: 80 }}
            style={{ marginHorizontal: 20 }}
          >
            {lightGroups.bathroom.map((lightId) => (
              <SimpleHoldToDimLight
                key={lightId}
                name={lightDisplayNames[lightId] || lightId}
                lightId={lightId}
                value={localLightBrightness[lightId] || 0}
                isOn={lightStates[lightId] || false}
                supportsDimming={supportsDimming}
              />
            ))}
          </ScrollView>
        </View>
      );
    }
  };

  var logo = <Image
    className="h-20 w-20 mb-4 mx-14"
    source={require("../assets/WifiTablet.png")}
  />;

  return (
    <View>
      <ScrollView 
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom:120 }} 
        decelerationRate={0.9}
        className="bg-brown"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.devices1}>Devices</Text>
        </View>
        <Text style={styles.hiDrax}>Hi, {deviceName || 'there'}</Text>
        <View>
          <View style={styles.tabContainer}>
            {Object.values(TABS).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {renderTabContent()}
        </View>

        {/* Awning Control Modal */}
        <AwningControlModal isVisible={isModalVisible} onClose={() => setModalVisible(false)} />
        
        {/* Heater Control Modal */}
        <HeaterControlModal isVisible={isHeaterModalVisible} onClose={() => setHeaterModalVisible(false)} />

        {/* Add Device Modal */}
        <AddDeviceModal isVisible={isAddDeviceVisible} onClose={() => setAddDeviceVisible(false)} />
        
        {/* Status message */}
        {showStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusMessageText}>{statusMessage}</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.buttonContainer} className="bg-brown py-5">
        <TouchableOpacity style={styles.orangeButton} onPress={() => setAddDeviceVisible(true)}>
          <Text style={styles.orangeButtonText}>Add Device</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  masterLightContainer: {
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    padding: 15,
  },
  masterLightContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masterLightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterLightIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  masterLightText: {
    color: 'white',
    fontSize: 16,
  },
  masterLightRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 3,
    backgroundColor: '#696969',
    marginVertical: 16,
    marginHorizontal: 17
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 20,
  },
  whiteButton: {
    backgroundColor: 'white',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  whiteButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  orangeButton: {
    backgroundColor: '#FFB267',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  orangeButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  screenContainer: {
    marginTop: 10,
    flex: 1,
    paddingHorizontal: 20,
  },
  porchLightContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#1B1B1B',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.85,
    shadowRadius: 5.84,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#FFF',
    marginLeft: 10,
    fontSize: 16,
  },
  ellipseIcon: {
    left: 30,
    width: 22,
    height: 22,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Padding.p_5xs,
    paddingTop: Padding.p_3xs,
    marginTop: 20,
  },
  devices1: {
    fontSize: FontSize.size_13xl,
    color: Color.colorWhitesmoke_100,
    fontFamily: FontFamily.manropeMedium,
    fontWeight: "500",
    textAlign: "left",
    top: 30,
    left: 19
  },
  wifisolar: {
    fontSize: FontSize.textXSM_size,
    color: Color.white0,
    top: 30,
    right: 30
  },
  hiDrax: {
    color: Color.white0,
    lineHeight: 24,
    fontSize: FontSize.size_mid,
    marginLeft: 18,
    marginTop: 10,
    top: 30,
    left: 10
  },
  customDevicesTitle: {
    color: Color.white0,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Padding.p_5xs,
    backgroundColor: Color.colorGray_200,
    marginBottom: 20,
    marginTop: 30,
  },
  tabButton: {
    paddingVertical: Padding.p_5xs,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: Color.white0,
  },
  tabText: {
    color: Color.white0,
    fontSize: FontSize.textLMedium_size,
    fontFamily: FontFamily.manropeMedium,
    textAlign: "center",
  },
  activeTabText: {
    color: Color.white0,
  },
  tabContentText: {
    fontSize: FontSize.size_mid,
    color: Color.white0,
    textAlign: "center",
    marginTop: 20,
  },
  FanControls: {
    marginRight: 20,
    marginBottom: 10,
    color: Color.white0,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeMedium,
    fontWeight: "500",
    textAlign: "center",
  },
  fanButtonContainer: {
    width: 100,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    
  },
  fanButtonOn: {
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#388E3C",
  },
  fanButtonOff: {
    backgroundColor: "#FF6B6B",
    borderWidth: 2,
    borderColor: "#D32F2F",
  },
  disabledButton: {
    opacity: 0.7,
  },
  
  fanControlsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
  },

   waterControlButton: {
    width: 140,
    height: 140,
    borderRadius: 16,
    justifyContent: 'space-between',   // match fan
    alignItems: 'center',
    padding: 15,                        // match fan
    marginHorizontal: 10,
    backgroundColor: '#8AB9F1',
    borderWidth: 2,
    borderColor: '#66B2FF',
    shadowColor: '#66B2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  waterControlButtonActive: {
    backgroundColor: '#005BB5',         // slightly brighter when ON
    borderColor: '#99CCFF',
  },
  waterControlButtonInactive: {
    backgroundColor: '#002147',         // darker when OFF
    borderColor: '#224E7A',
  },
  waterIconCircleActive: {
    backgroundColor: '#66B2FF',
  },
  waterIconCircleInactive: {
    backgroundColor: '#003153',
    borderWidth: 1,
    borderColor: '#224E7A',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'center',
    marginHorizontal: 40,
    zIndex: 1000,
  },
  statusMessageText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Fan Controls - Modern Style
fanControlsContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginVertical: 20,
  paddingHorizontal: 10,
},
modernFanButton: {
  width: 140,
  height: 140,
  borderRadius: 16,
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 15,
  marginHorizontal: 10,
  shadowColor: '#66B2FF',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.5,
  shadowRadius: 12,
  elevation: 8,
  elevation: 6,
  borderWidth: 1,
},
fanButtonActive: {
  backgroundColor: '#27303F',
  borderColor: '#4F7BFA',
},
fanButtonInactive: {
  backgroundColor: '#1E242E',
  borderColor: '#323845',
},
fanIconContainer: {
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 12,
},
fanIconCircle: {
  width: 60,
  height: 60,
  borderRadius: 30,
  justifyContent: 'center',
  alignItems: 'center',
},
iconCircleActive: {
  backgroundColor: '#4F7BFA',
},
iconCircleInactive: {
  backgroundColor: '#2D333F',
  borderWidth: 1,
  borderColor: '#3D4452',
},
fanButtonLabel: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '600',
  marginBottom: 8,
},
statusIndicator: {
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
  minWidth: 46,
  alignItems: 'center',
},
statusActive: {
  backgroundColor: '#4F7BFA',
},
statusInactive: {
  backgroundColor: '#323845',
},
statusText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '700',
},
disabledButton: {
  opacity: 0.6,
},

});


export default Devices;