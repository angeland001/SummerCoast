// Weather and API related helper functions
import axios from 'axios';

/**
 * Get weather icon based on condition
 * @param {string} condition - Weather condition
 * @returns {string} - Weather emoji
 */
export const getWeatherIcon = (condition) => {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes('clear')) return '☀️';
  if (conditionLower.includes('cloud')) return '☁️';
  if (conditionLower.includes('rain')) return '🌧️';
  if (conditionLower.includes('snow')) return '❄️';
  if (conditionLower.includes('storm')) return '⛈️';
  return '🌤️';
};

/**
 * Filter, sort, and trim raw forecast data from the API
 * @param {Array} list - Raw forecast list from OpenWeatherMap
 * @param {boolean} isTablet - Whether device is tablet
 * @returns {Array} - Upcoming forecasts, soonest first
 */
const processForecastList = (list, isTablet) => {
  const currentTime = new Date();
  const futureForecasts = list.filter(
    item => new Date(item.dt * 1000) > currentTime
  );
  const sortedForecasts = futureForecasts.sort(
    (a, b) => new Date(a.dt * 1000) - new Date(b.dt * 1000)
  );

  return sortedForecasts.slice(0, isTablet ? 1 : 5);
};

/**
 * Fetch hourly weather data by city name
 * @param {string} city - City name
 * @param {boolean} isTablet - Whether device is tablet
 * @returns {Promise<Array>} - Array of weather data
 */
export const fetchHourlyWeather = async (city = "Chattanooga", isTablet = false) => {
  const apiKey = "5819cdd3f2d4610ea874f8bab06d02cb";
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`;
  
  try {
    const response = await axios.get(url);
    return processForecastList(response.data.list, isTablet);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error;
  }
};

/**
 * Fetch hourly weather data by GPS coordinates
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {boolean} isTablet - Whether device is tablet
 * @returns {Promise<{forecasts: Array, locationName: string}>} - Forecasts plus the resolved city name
 */
export const fetchHourlyWeatherByCoords = async (latitude, longitude, isTablet = false) => {
  const apiKey = "5819cdd3f2d4610ea874f8bab06d02cb";
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;

  try {
    const response = await axios.get(url);

    return {
      forecasts: processForecastList(response.data.list, isTablet),
      locationName: response.data.city?.name || "Current Location"
    };
  } catch (error) {
    console.error("Error fetching weather data by coordinates:", error);
    throw error;
  }
};

/**
 * Format weather item for display
 * @param {Object} item - Weather item from API
 * @returns {Object} - Formatted weather display data
 */
export const formatWeatherItem = (item) => {
  const date = new Date(item.dt * 1000);
  const hour = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const tempF = (((item.main.temp - 273.15) * 9/5) + 32).toFixed(0);
  const weatherIcon = getWeatherIcon(item.weather[0].main);

  return {
    hour,
    weatherIcon,
    tempF,
    condition: item.weather[0].description
  };
};