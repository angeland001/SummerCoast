// Data formatting and processing helper functions

/**
 * Format grid power display
 * @param {Object} victronData - Victron energy data
 * @returns {string} - Formatted grid power display
 */
export const formatGridPower = (victronData) => {
  if (!victronData || !victronData.grid) {
    return "--";
  }
  
  // If grid is not connected, show as disconnected
  if (!victronData.grid.isConnected) {
    return "Shore Disconnected";
  }
  
  // Build a string with total power and individual line info if available
  let displayText = `${victronData.grid.power}W`;
  
  // Add line info if we have multiple lines or specific line data
  const l1 = victronData.grid.l1Power;
  const l2 = victronData.grid.l2Power;
  
  if (l1 !== 0 || l2 !== 0) {
    displayText += `\nL1: ${l1}W L2: ${l2}W`;
  }
  
  return displayText;
};

/**
 * Get battery state of charge as percentage
 * @param {Object} victronData - Victron energy data
 * @returns {string} - Battery SOC percentage formatted to one decimal place
 */
export const getBatterySOC = (victronData) => {
  const soc = victronData?.battery?.soc ?? 0;
  const pct = soc <= 1 ? soc * 100 : soc;

  if (!Number.isFinite(pct)) {
    return "0.0";
  }

  return pct.toFixed(1);
};

/**
 * Get battery power with proper sign
 * @param {Object} victronData - Victron energy data
 * @returns {number} - Battery power in watts
 */
export const getBatteryPower = (victronData) => {
  if (!victronData || !victronData.battery) return 0;
  return victronData.battery.power;
};

/**
 * Get battery voltage
 * @param {Object} victronData - Victron energy data
 * @returns {string} - Battery voltage formatted to 1 decimal
 */
export const getBatteryVoltage = (victronData) => {
  if (!victronData || !victronData.battery) return '0.0';
  return victronData.battery.voltage?.toFixed(1) || '0.0';
};

/**
 * Get battery current
 * @param {Object} victronData - Victron energy data
 * @returns {string} - Battery current formatted to 1 decimal
 */
export const getBatteryCurrent = (victronData) => {
  if (!victronData || !victronData.battery) return '0.0';
  return victronData.battery.current?.toFixed(1) || '0.0';
};

/**
 * Get system status indicator
 * @param {Object} victronData - Victron energy data
 * @returns {Object} - Status object with status text and color
 */
export const getSystemStatus = (victronData) => {
  if (!victronData) return { status: 'Unknown', color: '#666' };
  
  if (victronData.apiStatus === 'simulation') {
    return { status: 'Simulation', color: '#FF9800' };
  }
  
  if (victronData.grid && victronData.grid.isConnected) {
    return { status: 'Shore Power', color: '#4CAF50' };
  }
  
  if (victronData.pvCharger && victronData.pvCharger.power > 0) {
    return { status: 'Solar Charging', color: '#FFD700' };
  }
  
  return { status: 'Battery Power', color: '#2196F3' };
};

/**
 * Format temperature with proper unit
 * @param {number} temp - Temperature value
 * @param {string} unit - Temperature unit ('F' or 'C')
 * @returns {string} - Formatted temperature
 */
export const formatTemperature = (temp, unit = 'F') => {
  if (temp === undefined || temp === null) return '--';
  return `${temp}°${unit}`;
};

/**
 * Format power value with appropriate unit
 * @param {number} power - Power value in watts
 * @returns {string} - Formatted power with unit
 */
export const formatPower = (power) => {
  if (power === undefined || power === null) return '--';
  
  if (Math.abs(power) >= 1000) {
    return `${(power / 1000).toFixed(1)}kW`;
  }
  
  return `${power}W`;
};

/**
 * Format energy value with appropriate unit
 * @param {number} energy - Energy value in kWh
 * @returns {string} - Formatted energy with unit
 */
export const formatEnergy = (energy) => {
  if (energy === undefined || energy === null) return '--';
  
  if (energy < 1) {
    return `${(energy * 1000).toFixed(0)}Wh`;
  }
  
  return `${energy.toFixed(2)}kWh`;
};

/**
 * Format percentage value
 * @param {number} percentage - Percentage value (0-100)
 * @returns {string} - Formatted percentage
 */
export const formatPercentage = (percentage) => {
  if (percentage === undefined || percentage === null) return '--';
  return `${Math.round(percentage)}%`;
};

/**
 * Format voltage value
 * @param {number} voltage - Voltage value
 * @returns {string} - Formatted voltage
 */
export const formatVoltage = (voltage) => {
  if (voltage === undefined || voltage === null) return '--';
  return `${voltage.toFixed(1)}V`;
};

/**
 * Format current value
 * @param {number} current - Current value in amps
 * @returns {string} - Formatted current
 */
export const formatCurrent = (current) => {
  if (current === undefined || current === null) return '--';
  return `${current.toFixed(1)}A`;
};

/**
 * Format frequency value
 * @param {number} frequency - Frequency in Hz
 * @returns {string} - Formatted frequency
 */
export const formatFrequency = (frequency) => {
  if (frequency === undefined || frequency === null) return '--';
  return `${frequency.toFixed(1)}Hz`;
};