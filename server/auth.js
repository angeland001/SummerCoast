// server/auth.js
// Token-based authentication for the RV control server.
//
// Design:
//   - Devices pair by sending a PIN to POST /api/auth/login and receive a
//     bearer token tied to a permission level (owner or guest).
//   - Tokens expire after 24 hours and are persisted to a JSON file so a
//     server restart does not log everyone out.
//   - requireAuth() is an Express middleware that protects every /api route
//     except the ones listed in PUBLIC_PATHS.
//   - Guests can use the predefined command endpoints but not /api/raw
//     (raw CAN frames are owner-only).
//
// Wiring it into server.js takes three lines - see AUTH_INTEGRATION.md.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKENS_FILE = path.join(__dirname, 'auth-tokens.json');
const CONFIG_FILE = path.join(__dirname, 'auth-config.json');

// Endpoints that must stay reachable without a token.
// The monitoring GETs are read-only telemetry polled by plain fetch()
// calls in the app; they stay open like the WebSocket CAN stream until
// both are hardened together (see AUTH_INTEGRATION.md, future work).
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/status',
  '/api/can-data',
  '/api/dimming-updates',
  '/api/brightness-status',
];

// Endpoints that require the owner permission level.
const OWNER_ONLY_PATHS = ['/api/raw'];

const DEFAULT_CONFIG = {
  ownerPin: '1234',
  guestPin: '0000',
};

let config = DEFAULT_CONFIG;
try {
  config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
} catch (_) {
  // No config file yet - write the defaults so the pins are easy to find and change.
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
  } catch (writeError) {
    console.warn('auth: could not write default config:', writeError.message);
  }
}

// token -> { deviceName, permission, createdAt, expiresAt }
let tokens = {};
try {
  tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
} catch (_) {
  tokens = {};
}

const persistTokens = () => {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.warn('auth: could not persist tokens:', error.message);
  }
};

const pruneExpired = () => {
  const now = Date.now();
  let changed = false;
  for (const [token, session] of Object.entries(tokens)) {
    if (session.expiresAt <= now) {
      delete tokens[token];
      changed = true;
    }
  }
  if (changed) persistTokens();
};

const tokenFromRequest = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

const sessionForRequest = (req) => {
  pruneExpired();
  const token = tokenFromRequest(req);
  return token && tokens[token] ? { token, ...tokens[token] } : null;
};

// POST /api/auth/login  { pin, deviceName }
const handleLogin = (req, res) => {
  const { pin, deviceName } = req.body || {};

  if (!pin || !deviceName) {
    return res.status(400).json({ status: 'error', message: 'pin and deviceName are required' });
  }

  let permission = null;
  if (pin === config.ownerPin) permission = 'owner';
  else if (pin === config.guestPin) permission = 'guest';

  if (!permission) {
    console.log(`auth: rejected login for "${deviceName}" (bad pin)`);
    return res.status(401).json({ status: 'error', message: 'Invalid PIN' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  tokens[token] = {
    deviceName: String(deviceName).slice(0, 64),
    permission,
    createdAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  };
  persistTokens();

  console.log(`auth: "${deviceName}" logged in as ${permission}`);
  res.json({
    status: 'success',
    token,
    permission,
    deviceName: tokens[token].deviceName,
    expiresAt: tokens[token].expiresAt,
  });
};

// GET /api/auth/verify (Bearer)
const handleVerify = (req, res) => {
  const session = sessionForRequest(req);
  if (!session) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
  res.json({
    status: 'success',
    permission: session.permission,
    deviceName: session.deviceName,
    expiresAt: session.expiresAt,
  });
};

// POST /api/auth/logout (Bearer)
const handleLogout = (req, res) => {
  const token = tokenFromRequest(req);
  if (token && tokens[token]) {
    console.log(`auth: "${tokens[token].deviceName}" logged out`);
    delete tokens[token];
    persistTokens();
  }
  res.json({ status: 'success' });
};

// GET /api/auth/devices (owner only) - list paired devices
const handleListDevices = (req, res) => {
  const session = sessionForRequest(req);
  if (!session || session.permission !== 'owner') {
    return res.status(403).json({ status: 'error', message: 'Owner permission required' });
  }
  pruneExpired();
  const devices = Object.entries(tokens).map(([token, s]) => ({
    deviceName: s.deviceName,
    permission: s.permission,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    current: token === session.token,
  }));
  res.json({ status: 'success', devices });
};

// Express middleware protecting every /api route except PUBLIC_PATHS.
const requireAuth = (req, res, next) => {
  const routePath = req.path;

  if (!routePath.startsWith('/api')) return next();
  if (PUBLIC_PATHS.some((p) => routePath === p || routePath.startsWith(p + '/'))) return next();

  const session = sessionForRequest(req);
  if (!session) {
    return res.status(401).json({ status: 'error', code: 'AUTH_REQUIRED', message: 'Authentication required' });
  }

  if (OWNER_ONLY_PATHS.some((p) => routePath === p) && session.permission !== 'owner') {
    return res.status(403).json({ status: 'error', code: 'OWNER_ONLY', message: 'Owner permission required' });
  }

  req.auth = session;
  next();
};

// Mounts the auth endpoints and the guard on an Express app.
const install = (app) => {
  app.post('/api/auth/login', handleLogin);
  app.get('/api/auth/verify', handleVerify);
  app.post('/api/auth/logout', handleLogout);
  app.get('/api/auth/devices', handleListDevices);
  app.use(requireAuth);
};

module.exports = { install, requireAuth, handleLogin, handleVerify, handleLogout, handleListDevices };
