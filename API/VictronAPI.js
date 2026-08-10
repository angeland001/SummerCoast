// API/VictronAPI.js - Updated with Grid Power and DC Power support
import axios from 'axios';

// Use the same base URL as your RV control API
import { RVControlService } from './rvAPI'; 

// Extract the base URL from the RV control API or use fallback
// This is more robust in determining the correct base URL
const getBaseURL = () => {
  // Check if RVControlService has a baseURL property
  if (RVControlService.baseURL) {
    console.log('Using baseURL from RVControlService:', RVControlService.baseURL);
    // Extract the base part (http://hostname:port)
    const urlParts = RVControlService.baseURL.split('/api');
    return urlParts[0];
  }
  
  // Fallback to the default IP
  console.log('Using default baseURL: http://169.254.9.43:502');
  return 'http://169.254.9.43:502';
};

// Create a Victron-specific API instance with longer timeout
const api = axios.create({
  baseURL: `${getBaseURL()}/api/victron`,
  timeout: 10000, // 10 second timeout for slower connections
});

// Log configuration on startup
console.log(`VictronAPI configured with baseURL: ${api.defaults.baseURL}`);

// Follow a server address change (see rvAPI.setServerHost).
export const setVictronHost = (host) => {
  api.defaults.baseURL = `http://${host}:3000/api/victron`;
};

// Attach or clear the bearer token (see AuthService).
export const setVictronAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * API client for Victron Energy integration
 */
export const VictronAPI = {
  /**
   * Get all Victron system data
   * @returns {Promise<Object>} All system data
   */
  getAllData: async () => {
    try {
      console.log('Fetching all Victron data from:', `${api.defaults.baseURL}/all`);
      const response = await api.get('/all');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching Victron data:', error);
      
      // Enhanced error logging for debugging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received, request details:', error.request);
      }
      
      throw error;
    }
  },

  /**
   * Get battery status
   * @returns {Promise<Object>} Battery data
   */
  getBatteryStatus: async () => {
    try {
      console.log('Fetching battery status from:', `${api.defaults.baseURL}/battery`);
      const response = await api.get('/battery');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching battery data:', error);
      throw error;
    }
  },

  /**
   * Get PV (solar) charger data
   * @returns {Promise<Object>} PV charger data
   */
  getPVChargerData: async () => {
    try {
      const response = await api.get('/pv');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching PV charger data:', error);
      throw error;
    }
  },

  /**
   * Get AC loads data
   * @returns {Promise<Object>} AC loads data
   */
  getACLoadsData: async () => {
    try {
      const response = await api.get('/ac-loads');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching AC loads data:', error);
      throw error;
    }
  },

  /**
   * Get DC system data
   * @returns {Promise<Object>} DC system data
   */
  getDCSystemData: async () => {
    try {
      const response = await api.get('/dc-system');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching DC system data:', error);
      throw error;
    }
  },
  
  /**
   * Get Grid power data
   * @returns {Promise<Object>} Grid data
   */
  getGrid: async () => {
    try {
      const response = await api.get('/grid');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching grid data:', error);
      throw error;
    }
  },

  /**
   * Get system overview
   * @returns {Promise<Object>} System overview data
   */
  getSystemOverview: async () => {
    try {
      const response = await api.get('/system');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching system overview:', error);
      throw error;
    }
  },

  /**
   * Get API status
   * @returns {Promise<Object>} API status and configuration
   */
  getAPIStatus: async () => {
    try {
      const response = await api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching API status:', error);
      throw error;
    }
  },

  /**
   * Toggle simulation mode
   * @param {boolean} enabled - Whether to enable simulation mode
   * @returns {Promise<Object>} Response with simulation status
   */
  toggleSimulation: async (enabled) => {
    try {
      const response = await api.post('/simulation', { enabled });
      return response.data;
    } catch (error) {
      console.error('Error toggling simulation mode:', error);
      throw error;
    }
  },

  /**
   * Update configuration
   * @param {Object} config - New configuration values
   * @returns {Promise<Object>} Updated configuration
   */
  updateConfiguration: async (config) => {
    try {
      const response = await api.post('/config', config);
      return response.data;
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  },

  /**
   * Reconnect to Victron system
   * @returns {Promise<Object>} Response with connection status
   */
  reconnect: async () => {
    try {
      const response = await api.post('/reconnect');
      return response.data;
    } catch (error) {
      console.error('Error reconnecting to Victron system:', error);
      throw error;
    }
  },
  
  /**
   * Check if the API is available
   * @returns {Promise<boolean>} True if the API is available
   */
  checkApiAvailable: async () => {
    try {
      // Try a simple GET request to check if the API is available
      await api.get('/status');
      console.log('Victron API is available');
      return true;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Expected before login finishes - AuthContext re-initializes
        // the service once the session token is in place.
        console.log('Victron API waiting for authentication');
      } else {
        console.error('Victron API is not available:', error.message);
      }
      return false;
    }
  }
};