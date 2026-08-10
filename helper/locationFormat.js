// helper/locationFormat.js
// Presentation helpers for GPS readouts. expo-location reports metric
// values and uses null or -1 for "unknown", which every screen would
// otherwise have to special-case.

const isKnown = (value) => value !== null && value !== undefined && value >= 0;

export const formatCoordinate = (value, positive, negative) => {
  if (value === null || value === undefined) return '--';
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(5)}° ${direction}`;
};

export const formatLatitude = (value) => formatCoordinate(value, 'N', 'S');
export const formatLongitude = (value) => formatCoordinate(value, 'E', 'W');

// expo-location gives speed in metres per second.
export const formatSpeed = (metersPerSecond) => {
  if (!isKnown(metersPerSecond)) return '--';
  return `${(metersPerSecond * 2.23694).toFixed(1)} mph`;
};

export const formatAltitude = (meters) => {
  if (meters === null || meters === undefined) return '--';
  return `${Math.round(meters * 3.28084)} ft`;
};

export const formatAccuracy = (meters) => {
  if (!isKnown(meters)) return '--';
  return `${Math.round(meters * 3.28084)} ft`;
};

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const formatHeading = (degrees) => {
  if (!isKnown(degrees)) return '--';
  const point = COMPASS[Math.round(degrees / 45) % 8];
  return `${point} (${Math.round(degrees)}°)`;
};

export const formatFixAge = (timestamp) => {
  if (!timestamp) return '--';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
};

// True when the RV is actually moving, used to show the driving readouts.
export const isMoving = (speed) => isKnown(speed) && speed > 0.5;
