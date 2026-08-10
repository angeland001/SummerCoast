# Adding authentication to the Pi server

The app now logs in before controlling the RV. The server side lives in
`server/auth.js` in this repo and has to be wired into the `server.js`
that runs on the Raspberry Pi (`/home/pi/rv-control/server.js`).

## Steps

1. Copy `server/auth.js` next to `server.js` on the Pi:

   ```
   scp server/auth.js pi@192.168.8.200:/home/pi/rv-control/
   ```

2. In `server.js`, after `app.use(bodyParser.json())` (or `express.json()`)
   and BEFORE any `/api` routes are defined, add:

   ```js
   const auth = require('./auth');
   auth.install(app);
   ```

   `install()` registers the login/verify/logout/devices endpoints and a
   middleware that returns 401 for every other `/api` route unless the
   request carries a valid `Authorization: Bearer <token>` header.

3. Restart the server (`pm2 restart rv-control` or systemd equivalent).

## PINs

On first start the module writes `auth-config.json` next to itself:

```json
{ "ownerPin": "1234", "guestPin": "0000" }
```

Change both pins there and restart. Owner devices can use every endpoint;
guests can control predefined commands but not `POST /api/raw`.

## What stays open

- `POST /api/auth/login` - needed to pair
- `GET /api/status` - health check / discovery
- `GET /api/can-data`, `GET /api/dimming-updates`,
  `GET /api/brightness-status` - read-only monitoring, same trust level
  as the unauthenticated WebSocket CAN stream

Every control endpoint under `/api` requires a token. Tokens live 24
hours and survive server restarts (`auth-tokens.json`).

## Future hardening (not done yet)

- Require the token on the WebSocket connection as well (currently the
  CAN monitor stream is read-only and unauthenticated).
- Rate-limit login attempts.
- Replace PINs with the QR pairing flow from rvDiscoveryServer.js.
