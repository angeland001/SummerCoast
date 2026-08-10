import React, { useState, useEffect, useRef } from "react";
import { View, Text } from "react-native";
import VerticalSlider from "react-native-vertical-slider-smartlife";
import useScreenSize from "../helper/useScreenSize.jsx";
import { createCANBusListener } from "../Service/CANBusListener";

const TankHeaterControl = ({ name, tankType, trackColor }) => {
  const [percentage, setPercentage] = useState(25); // Start with current actual levels
  const [rawData, setRawData] = useState(null); // Store raw CAN data for debugging
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const canListener = useRef(null);
  const reconnectTimeout = useRef(null);
  const isTablet = useScreenSize();

  // Calibration offsets - adjust these based on observed differences
  const CALIBRATION_OFFSETS = {
    fresh: -7,  // RV shows 25%, app shows 32%, so subtract 7%
    gray: 0,    // Adjust if needed
    black: 0    // Adjust if needed
  };

  // Initialize tank levels based on current real data
  useEffect(() => {
    const initializeTankLevels = () => {
      if (tankType === "fresh") {
        setPercentage(25); // Current fresh water level
      } else if (tankType === "gray") {
        setPercentage(0); // Current gray water level
      } else if (tankType === "black") {
        setPercentage(0); // Assuming black tank is also empty
      }
    };

    initializeTankLevels();
  }, [tankType]);

  // Set up CAN bus listener for real-time tank data
  useEffect(() => {
    const setupCANListener = () => {
      try {
        console.log(`TankHeaterControl: Setting up CAN listener for ${name} (${tankType})`);
        
        canListener.current = createCANBusListener();
        
        // Listen for tank status messages
        canListener.current.on('message', (message) => {
          try {
            // Look for TANK_STATUS messages (DGN 1FFB7)
            if (message.dgn === '1FFB7' || message.name === 'TANK_STATUS') {
              handleTankStatusMessage(message);
            }
          } catch (error) {
            console.error('Error processing tank message:', error);
          }
        });

        canListener.current.on('connected', () => {
          console.log(`TankHeaterControl: CAN listener connected for ${name}`);
          setIsConnected(true);
          setLastUpdate(new Date());
        });

        canListener.current.on('disconnected', () => {
          console.log(`TankHeaterControl: CAN listener disconnected for ${name}`);
          setIsConnected(false);
          // Try to reconnect after a delay
          scheduleReconnect();
        });

        canListener.current.on('error', (error) => {
          console.error(`TankHeaterControl: CAN listener error for ${name}:`, error);
          setIsConnected(false);
          scheduleReconnect();
        });

        // Start the listener
        canListener.current.start();

      } catch (error) {
        console.error(`TankHeaterControl: Failed to setup CAN listener for ${name}:`, error);
        scheduleReconnect();
      }
    };

    setupCANListener();

    // Cleanup on unmount
    return () => {
      if (canListener.current) {
        canListener.current.stop();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [name, tankType]);

  const scheduleReconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    reconnectTimeout.current = setTimeout(() => {
      console.log(`TankHeaterControl: Attempting to reconnect CAN listener for ${name}`);
      if (canListener.current) {
        canListener.current.start();
      }
    }, 5000); // Retry every 5 seconds
  };

  const handleTankStatusMessage = (message) => {
    try {
      // Parse tank status from CAN message
      const tankInstance = message.instance;
      const instanceDefinition = message["instance definition"];
      const relativeLevel = message["relative level"];
      const resolution = message.resolution || 4;
      
      // Store raw data for debugging
      setRawData({
        instance: tankInstance,
        definition: instanceDefinition,
        relativeLevel: relativeLevel,
        resolution: resolution,
        timestamp: new Date().toISOString()
      });
      
      // Map tank instances to our tank types
      let matchesTankType = false;
      
      if (tankType === "fresh" && (tankInstance === 0 || instanceDefinition === "fresh water")) {
        matchesTankType = true;
      } else if (tankType === "gray" && (tankInstance === 2 || instanceDefinition === "gray water")) {
        matchesTankType = true;
      } else if (tankType === "black" && (tankInstance === 1 || instanceDefinition === "black waste")) {
        matchesTankType = true;
      }
      
      if (matchesTankType && relativeLevel !== undefined) {
        // Try multiple calculation methods to see which matches RV display
        
        // Method 1: Original calculation (what you're currently using)
        const maxLevel = Math.pow(2, resolution) - 1;
        const originalPercentage = Math.round((relativeLevel / maxLevel) * 100);
        
        // Method 2: Discrete 25% increments (common in RVs)
        const discretePercentage = relativeLevel * 25;
        
        // Method 3: Simple division by resolution
        const simplePercentage = Math.round((relativeLevel / resolution) * 100);
        
        // Method 4: Alternative max level calculation
        const altMaxLevel = Math.pow(2, resolution);
        const altPercentage = Math.round((relativeLevel / altMaxLevel) * 100);
        
        console.log(`=== TANK DEBUG: ${name} ===`);
        console.log(`Raw data: level=${relativeLevel}, resolution=${resolution}`);
        console.log(`Method 1 (current): ${originalPercentage}% (${relativeLevel}/${maxLevel})`);
        console.log(`Method 2 (discrete): ${discretePercentage}% (${relativeLevel} * 25)`);
        console.log(`Method 3 (simple): ${simplePercentage}% (${relativeLevel}/${resolution})`);
        console.log(`Method 4 (alt max): ${altPercentage}% (${relativeLevel}/${altMaxLevel})`);
        
        // Choose the calculation method - start with discrete since RVs often use 25% increments
        let calculatedPercentage;
        
        if (resolution === 4 && relativeLevel <= 4) {
          // For resolution 4, try discrete 25% increments first
          calculatedPercentage = discretePercentage;
          console.log(`Using discrete method: ${calculatedPercentage}%`);
        } else {
          // Fall back to original method
          calculatedPercentage = originalPercentage;
          console.log(`Using original method: ${calculatedPercentage}%`);
        }
        
        // Apply calibration offset
        const calibrationOffset = CALIBRATION_OFFSETS[tankType] || 0;
        const finalPercentage = Math.max(0, Math.min(100, calculatedPercentage + calibrationOffset));
        
        console.log(`After calibration offset (${calibrationOffset}%): ${finalPercentage}%`);
        console.log(`=== END DEBUG ===`);
        
        setPercentage(finalPercentage);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error(`TankHeaterControl: Error parsing tank status for ${name}:`, error);
    }
  };

  // Handle manual slider changes (for testing/calibration)
  const handleSliderChange = (value) => {
    console.log(`TankHeaterControl: Manual adjustment for ${name}: ${value}%`);
    setPercentage(value);
  };

  // Get connection status indicator
  const getConnectionStatus = () => {
    if (isConnected) {
      return { color: '#10B981', text: '●' }; // Green dot
    } else {
      return { color: '#EF4444', text: '●' }; // Red dot
    }
  };

  const connectionStatus = getConnectionStatus();

  // This preserves the original UI while adding real-time data
  if (isTablet) {
    return (
      <View className="flex-row justify-center items-center py-4" style={{ marginHorizontal: 8 }}>
        {/* Reduced height since no toggle */}
        <View className="items-center" style={{ minHeight: 180 }}>
          <View className="flex-row items-center mb-2">
            <Text className="text-white text-lg font-semibold">{name}</Text>
            <Text style={{ color: connectionStatus.color, marginLeft: 8, fontSize: 16 }}>
              {connectionStatus.text}
            </Text>
          </View>
          
          <VerticalSlider
            value={percentage}
            disabled={false} // Allow manual adjustment for testing
            min={0}
            max={100}
            width={60}
            height={120}
            step={1}
            borderRadius={5}
            minimumTrackTintColor={trackColor.minimum}
            maximumTrackTintColor={trackColor.maximum}
            onChange={handleSliderChange}
          />
          
          <Text className="text-white text-md font-semibold mt-2">{percentage}%</Text>
          
          {/* Debug info display */}
          {rawData && __DEV__ && (
            <View className="mt-1 p-2 bg-gray-800 rounded">
              <Text className="text-gray-300 text-xs">
                Raw: L{rawData.relativeLevel}/R{rawData.resolution}
              </Text>
              <Text className="text-gray-300 text-xs">
                Inst: {rawData.instance} ({rawData.definition})
              </Text>
            </View>
          )}
          
          {lastUpdate && (
            <Text className="text-gray-400 text-xs mt-1">
              {lastUpdate.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row justify-between py-2">
      {/* Reduced height */}
      <View className="items-center" style={{ minHeight: 120 }}>
        <Text className="text-white">{percentage}%</Text>
        <VerticalSlider
          value={percentage}
          disabled={false} // Allow manual adjustment for testing
          min={0}
          max={100}
          width={50}
          height={70}
          step={1}
          borderRadius={5}
          minimumTrackTintColor={trackColor.minimum}
          maximumTrackTintColor={trackColor.maximum}
          onChange={handleSliderChange}
        />
        
        {/* Debug info display for phone layout */}
        {rawData && __DEV__ && (
          <View className="mt-1 p-1 bg-gray-800 rounded">
            <Text className="text-gray-300 text-xs">
              L{rawData.relativeLevel}/R{rawData.resolution}
            </Text>
          </View>
        )}
        
        {lastUpdate && (
          <Text className="text-gray-400 text-xs mt-1">
            {lastUpdate.toLocaleTimeString()}
          </Text>
        )}
      </View>
      
      {/* Align to top */}
      <View className="flex-row mt-10" style={{ alignItems: 'flex-start' }}>
        <View className="flex-row items-center">
          <Text className="text-white text-lg mr-2">{name}</Text>
          <Text style={{ color: connectionStatus.color, fontSize: 14 }}>
            {connectionStatus.text}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default TankHeaterControl;