# Integration notes - Alireza's task branches

Three stacked local branches, each building on the previous one. Merging
`alireza/add-device` brings in everything; merging them one at a time
also works in this order:

```
7InchRVTablet (origin)
  -> alireza/responsive   responsive fixes + screen bugs
    -> alireza/auth       device authentication (app + server module)
      -> alireza/add-device  custom device support
```

## 1. alireza/responsive

- `useResponsive` hook classifies devices by the rotation-stable short
  side (phone < 500dp, 7" tablet 500-700dp, iPad > 700dp). The old
  `useScreenSize` now delegates to it, so every screen is fixed without
  changes.
- Victron System diagram renders in a fixed 968x435 design canvas and
  scales as one unit - hand-tuned connection lines stay aligned on any
  screen, and it no longer clips under the tab bar.
- LightScreenTablet rebuilt with flexbox (three equal room columns).
  This also made Awning/Porch/Hitch lights reachable - they were hidden
  by a fixed card height.
- ClimateControl: Auxiliary card and fan-speed list no longer clip
  (Auto button was invisible); fan-speed error-revert restored the
  wrong speed; invalid "100px" height removed.
- Tab bar: lights tab renamed Lights with a bulb icon (was "System"
  opening the lights screen); stray JSX whitespace that caused the
  "Text strings must be rendered within a <Text>" warning removed here
  and in TankHeaterControl.
- MainScreen Wifi tile no longer opens the Awning modal.
- Battery SOC no longer shows 8000+% (was multiplied by 100 twice).

## 2. alireza/auth

- Server: `server/auth.js` + `server/AUTH_INTEGRATION.md`. Two lines in
  the Pi's server.js turn on PIN login with 24h bearer tokens, owner
  and guest levels (guests cannot POST /api/raw). PINs live in
  `server/auth-config.json` (defaults 1234 / 0000 - change them).
- App: LoginScreen (PIN + device name + changeable server address +
  demo mode), AuthContext/AuthService (session restore, verify,
  logout), token attached to both API clients, Settings shows the
  paired device and signs out.
- Deploy order matters: ship the server change first, then the app -
  the old app keeps working against the new server only for the open
  monitoring endpoints, so pair them in one session.

## 3. alireza/add-device

- Devices screen's "Add Device" button now works. Custom devices are
  stored on-device (AsyncStorage), listed under "Custom Devices" on the
  Devices screen, and toggled through the existing POST /api/raw
  endpoint using the standard DC_DIMMER_COMMAND_2 toggle frames
  (latch C8 / dimmable FA). The modal previews the exact CAN frame
  before saving.
- Devices screen added as a tablet tab (it was phone-only before).

## Testing

Everything was verified on 7-inch (1280x800) and 11-inch (2360x1640)
Android emulators against a local stand-in server implementing the Pi
API plus the new auth module. Hardware verification still needed on the
real RV for: custom device frames on the physical bus, and the login
flow over the RV WiFi.
