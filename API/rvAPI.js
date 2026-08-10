import axios from 'axios';

// Set your Raspberry Pi's IP address and port
// You'll need to change this to your Raspberry Pi's actual IP on your network
const API_URL = 'http://192.168.8.200:3000/api';

// Create an instance of axios with the base URL
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 5 second timeout
});

// Attach or clear the bearer token for every later request.
// Called by AuthService on login, session restore and logout.
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Point the client at a different server (the login screen lets the
// user change the Pi's address without rebuilding the app).
export const setServerHost = (host) => {
  const base = `http://${host}:3000/api`;
  api.defaults.baseURL = base;
  RVControlService.baseURL = base;
};

// API service for RV Control
export const RVControlService = {
  // Get all available commands
  getCommands: async () => {
    try {
      const response = await api.get('/commands');
      return response.data;
    } catch (error) {
      console.error('Error fetching commands:', error);
      throw error;
    }
  },

  // Execute a predefined command
  executeCommand: async (command) => {
    try {
      const response = await api.post('/execute', { command });
      return response.data;
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      throw error;
    }
  },

  // Execute a raw CAN command
  executeRawCommand: async (canCommand) => {
    try {
      const response = await api.post('/raw', { canCommand });
      return response.data;
    } catch (error) {
      console.error(`Error executing raw command ${canCommand}:`, error);
      throw error;
    }
  },

  // Enhanced brightness control with ramp dimming
  setBrightnessRamp: async (lightId, targetBrightness, timeout = 10000) => {
    try {
      const response = await api.post('/brightness-ramp', { 
        lightId, 
        targetBrightness, 
        timeout 
      });
      return response.data;
    } catch (error) {
      console.error(`Error setting brightness for ${lightId}:`, error);
      throw error;
    }
  },

  // Cancel active dimming operation
  cancelDimming: async (lightId) => {
    try {
      const response = await api.post('/cancel-dimming', { lightId });
      return response.data;
    } catch (error) {
      console.error(`Error cancelling dimming for ${lightId}:`, error);
      throw error;
    }
  },

  // Get real-time brightness status for all lights
  getBrightnessStatus: async () => {
    try {
      const response = await api.get('/brightness-status');
      return response.data;
    } catch (error) {
      console.error('Error getting brightness status:', error);
      throw error;
    }
  },

  // Enhanced light control with multiple methods
  controlLight: async (lightId, action, options = {}) => {
    try {
      const requestData = {
        lightId,
        action,
        ...options
      };
      
      const response = await api.post('/light-control', requestData);
      return response.data;
    } catch (error) {
      console.error(`Error controlling light ${lightId}:`, error);
      throw error;
    }
  },

  // Original brightness control (fallback)
  setBrightness: async (lightId, level) => {
    try {
      const response = await api.post('/brightness', { lightId, level });
      return response.data;
    } catch (error) {
      console.error(`Error setting brightness for ${lightId}:`, error);
      throw error;
    }
  },

  // Get system status
  getStatus: async () => {
    try {
      const response = await api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error;
    }
  }
};

// Utility functions for common actions
export const RVControls = {
  // Lighting toggles
  toggleKitchenLights: () => RVControlService.executeCommand('kitchen_lights_toggle'),
  toggleBathroomLight: () => RVControlService.executeCommand('bath_light_toggle'),
  toggleBedroomLight: () => RVControlService.executeCommand('bed_ovhd_light_toggle'),
  toggleVibeLight: () => RVControlService.executeCommand('vibe_light_toggle'),
  toggleVanityLight: () => RVControlService.executeCommand('vanity_light_toggle'),
  toggleAwningLights: () => RVControlService.executeCommand('awning_lights_toggle'),
  toggleShowerLights: () => RVControlService.executeCommand('shower_lights_toggle'),
  toggleUnderCabinetLights: () => RVControlService.executeCommand('under_cab_lights_toggle'),
  toggleHitchLights: () => RVControlService.executeCommand('hitch_lights_toggle'),
  togglePorchLights: () => RVControlService.executeCommand('porch_lights_toggle'),
  toggleLeftReadingLights: () => RVControlService.executeCommand('left_reading_lights_toggle'),
  toggleRightReadingLights: () => RVControlService.executeCommand('right_reading_lights_toggle'),
  toggleDinetteLights: () => RVControlService.executeCommand('dinette_lights_toggle'),
  toggleStripLights: () => RVControlService.executeCommand('strip_lights_toggle'),

  // Enhanced light controls with ramp dimming
  setLightBrightness: (lightId, brightness) => RVControlService.setBrightnessRamp(lightId, brightness),
  setLightBrightnessFast: (lightId, brightness) => RVControlService.controlLight(lightId, 'brightness', { brightness, method: 'direct' }),
  turnLightOn: (lightId) => RVControlService.controlLight(lightId, 'on'),
  turnLightOff: (lightId) => RVControlService.controlLight(lightId, 'off'),
  toggleLight: (lightId) => RVControlService.controlLight(lightId, 'toggle'),
  
  // Dimming presets
  setMoodLighting: async () => {
    const moodSettings = [
      { lightId: 'vibe_light', brightness: 30 },
      { lightId: 'strip_lights', brightness: 20 },
      { lightId: 'under_cab_lights', brightness: 15 },
      { lightId: 'dinette_lights', brightness: 25 }
    ];
    
    // Turn off all lights first
    await RVControls.allLightsOff();
    
    // Apply mood settings with slight delays to prevent CAN bus congestion
    for (const setting of moodSettings) {
      try {
        await RVControlService.setBrightnessRamp(setting.lightId, setting.brightness);
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between lights
      } catch (error) {
        console.error(`Error setting mood lighting for ${setting.lightId}:`, error);
      }
    }
  },
  
  setEveningLighting: async () => {
    const eveningSettings = [
      { lightId: 'kitchen_lights', brightness: 35 },
      { lightId: 'dinette_lights', brightness: 30 },
      { lightId: 'bath_light', brightness: 25 },
      { lightId: 'vibe_light', brightness: 20 },
      { lightId: 'left_reading_lights', brightness: 40 },
      { lightId: 'right_reading_lights', brightness: 40 }
    ];
    
    // Turn off all lights first
    await RVControls.allLightsOff();
    
    // Apply evening settings
    for (const setting of eveningSettings) {
      try {
        await RVControlService.setBrightnessRamp(setting.lightId, setting.brightness);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error setting evening lighting for ${setting.lightId}:`, error);
      }
    }
  },

  // Main light controls
  allLightsOn: () => RVControlService.executeCommand('all_lights_on'),
  allLightsOff: () => RVControlService.executeCommand('all_lights_off'),
  
  // Fan controls
  toggleBathroomFan: () => RVControlService.executeCommand('bath_fan_toggle'),
  toggleBayVentFan: () => RVControlService.executeCommand('bay_vent_fan_toggle'),

  // AC Fan speed controls
  setHighFanSpeed: () => RVControlService.executeCommand('high_fan'),
  setMediumFanSpeed: () => RVControlService.executeCommand('medium_fan'),
  setLowFanSpeed: () => RVControlService.executeCommand('low_fan'),

  // Awning controls
  extendAwning: () => RVControlService.executeCommand('awning_extend'),
  retractAwning: () => RVControlService.executeCommand('awning_retract'),
  stopAwning: () => RVControlService.executeCommand('awning_stop'),

  // Bar lift controls
  barLiftUp: () => RVControlService.executeCommand('bar_lift_up'),
  barLiftDown: () => RVControlService.executeCommand('bar_lift_down'),

  // Water systems
  toggleWaterPump: () => RVControlService.executeCommand('water_pump_toggle'),
  toggleWaterHeater: () => RVControlService.executeCommand('water_heater_toggle'),

  // Thermostat controls
  increaseTemperature: () => RVControlService.executeCommand('temp_increase'),
  decreaseTemperature: () => RVControlService.executeCommand('temp_decrease'),
   
  // Climate presets
  setCoolingMode: () => RVControlService.executeCommand('cool_setting'),
  turnOffCooling: () => RVControlService.executeCommand('complete_cool_off'),
  setFurnaceOn: () => RVControlService.executeCommand('furnace_on'),
  setFurnaceOff: () => RVControlService.executeCommand('furnace_off'),
  setNightMode: () => RVControlService.executeCommand('night_setting'),
  setDehumidifyMode: () => RVControlService.executeCommand('dehumid_setting'),
  setToeKickMode: () => RVControlService.executeCommand('toe_kick'),
  turnOffToeKick: () => RVControlService.executeCommand('toe_kick_off'),
  setAutoMode: () => RVControlService.executeCommand('auto_setting'),
};

// Light dimming utilities
export const LightDimmer = {
  /**
   * Smoothly transition a light to a target brightness
   * @param {string} lightId - Light identifier
   * @param {number} targetBrightness - Target brightness (0-100)
   * @param {function} onProgress - Progress callback (currentBrightness, targetBrightness) => void
   * @param {number} timeout - Timeout in milliseconds
   */
  rampTo: async (lightId, targetBrightness, onProgress = null, timeout = 10000) => {
    try {
      console.log(`Ramping ${lightId} to ${targetBrightness}%`);
      
      // Use the enhanced ramp dimming API
      const result = await RVControlService.setBrightnessRamp(lightId, targetBrightness, timeout);
      
      // If progress callback is provided, simulate progress updates
      if (onProgress && result.status === 'success') {
        // Get current brightness status
        try {
          const statusResponse = await RVControlService.getBrightnessStatus();
          const lightState = statusResponse.lightStates?.[lightId];
          if (lightState) {
            onProgress(lightState.brightness, targetBrightness);
          }
        } catch (statusError) {
          console.warn('Could not get brightness status for progress callback:', statusError);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error ramping ${lightId}:`, error);
      throw error;
    }
  },

  /**
   * Ramp multiple lights simultaneously
   * @param {Array} lightSettings - Array of {lightId, targetBrightness}
   * @param {function} onProgress - Progress callback
   */
  rampMultiple: async (lightSettings, onProgress = null) => {
    const promises = lightSettings.map(async (setting) => {
      try {
        return await LightDimmer.rampTo(
          setting.lightId, 
          setting.targetBrightness, 
          onProgress ? (current, target) => onProgress(setting.lightId, current, target) : null
        );
      } catch (error) {
        console.error(`Error ramping ${setting.lightId}:`, error);
        return { success: false, lightId: setting.lightId, error: error.message };
      }
    });
    
    return await Promise.allSettled(promises);
  },

  /**
   * Fade a light in over time
   * @param {string} lightId - Light identifier
   * @param {number} duration - Fade duration in milliseconds
   * @param {number} targetBrightness - Target brightness (default 100)
   */
  fadeIn: async (lightId, duration = 3000, targetBrightness = 100) => {
    return await LightDimmer.rampTo(lightId, targetBrightness, null, duration);
  },

  /**
   * Fade a light out over time
   * @param {string} lightId - Light identifier  
   * @param {number} duration - Fade duration in milliseconds
   */
  fadeOut: async (lightId, duration = 3000) => {
    return await LightDimmer.rampTo(lightId, 0, null, duration);
  },

  /**
   * Cancel active dimming operation
   * @param {string} lightId - Light identifier
   */
  cancel: async (lightId) => {
    try {
      return await RVControlService.cancelDimming(lightId);
    } catch (error) {
      console.error(`Error cancelling dimming for ${lightId}:`, error);
      throw error;
    }
  },

  /**
   * Get current brightness status for all lights
   */
  getStatus: async () => {
    try {
      return await RVControlService.getBrightnessStatus();
    } catch (error) {
      console.error('Error getting brightness status:', error);
      throw error;
    }
  }
};

// Lighting scene presets
export const LightingScenes = {
  /**
   * Apply a custom lighting scene
   * @param {Object} scene - Scene configuration
   * @param {boolean} fadeTransition - Whether to use fade transitions
   */
  applyScene: async (scene, fadeTransition = true) => {
    try {
      console.log(`Applying lighting scene: ${scene.name}`);
      
      // Turn off all lights first if specified
      if (scene.resetFirst) {
        await RVControls.allLightsOff();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Apply each light setting
      const settings = Object.entries(scene.lights).map(([lightId, brightness]) => ({
        lightId,
        targetBrightness: brightness
      }));
      
      if (fadeTransition) {
        // Use ramp dimming for smooth transitions
        await LightDimmer.rampMultiple(settings);
      } else {
        // Use direct brightness setting for immediate changes
        for (const setting of settings) {
          await RVControlService.controlLight(
            setting.lightId, 
            'brightness', 
            { brightness: setting.targetBrightness, method: 'direct' }
          );
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return { success: true, scene: scene.name };
    } catch (error) {
      console.error(`Error applying scene ${scene.name}:`, error);
      throw error;
    }
  },

  // Predefined scenes
  scenes: {
    mood: {
      name: 'Mood Lighting',
      resetFirst: true,
      lights: {
        'vibe_light': 30,
        'strip_lights': 20,
        'under_cab_lights': 15,
        'dinette_lights': 25
      }
    },
    evening: {
      name: 'Evening Lighting',
      resetFirst: true,
      lights: {
        'kitchen_lights': 35,
        'dinette_lights': 30,
        'bath_light': 25,
        'vibe_light': 20,
        'left_reading_lights': 40,
        'right_reading_lights': 40
      }
    },
    reading: {
      name: 'Reading Mode',
      resetFirst: false,
      lights: {
        'left_reading_lights': 80,
        'right_reading_lights': 80,
        'bed_ovhd_light': 60
      }
    },
    nightLight: {
      name: 'Night Light',
      resetFirst: true,
      lights: {
        'under_cab_lights': 10,
        'strip_lights': 5,
        'bath_light': 15
      }
    },
    cooking: {
      name: 'Cooking Mode',
      resetFirst: false,
      lights: {
        'kitchen_lights': 90,
        'under_cab_lights': 85,
        'dinette_lights': 60
      }
    },
    movie: {
      name: 'Movie Mode',
      resetFirst: true,
      lights: {
        'strip_lights': 10,
        'vibe_light': 5
      }
    }
  },

  // Scene shortcuts
  setMoodLighting: (fadeTransition = true) => 
    LightingScenes.applyScene(LightingScenes.scenes.mood, fadeTransition),
  
  setEveningLighting: (fadeTransition = true) => 
    LightingScenes.applyScene(LightingScenes.scenes.evening, fadeTransition),
  
  setReadingMode: (fadeTransition = true) => 
    LightingScenes.applyScene(LightingScenes.scenes.reading, fadeTransition),
  
  setNightLight: (fadeTransition = true) => 
    LightingScenes.applyScene(LightingScenes.scenes.nightLight, fadeTransition),
  
  setCookingMode: (fadeTransition = true) => 
    LightingScenes.applyScene(LightingScenes.scenes.cooking, fadeTransition),
  
  setMovieMode: (fadeTransition = true) => 
    LightingScenes.applyScene(LightingScenes.scenes.movie, fadeTransition)
};

export default RVControls;