# Work Summary (Alireza)

Updated August 10, 2026

## How we split the work

Following the split in Task_Update.md, plus live GPS:

**My part**
1. Authentication
2. Responsive design
3. Add Device modal
4. Live GPS

**Alam's part**
1. Energy charts
2. Light scheduling modal
3. Weather auto refresh

All four of my tasks are finished and pushed. Details below.

## What I added

### 1. Responsive design (branch alireza/responsive)

The app was laid out for one screen size, so anything else broke.

* Rewrote how the app decides between phone and tablet layouts. It now
  measures the short side of the screen, which does not change when the
  device rotates, and sorts devices into phone, 7 inch tablet and iPad.
  The old check treated any short screen as a tablet, so an iPad in
  portrait got the phone layout and a phone in landscape got the tablet
  layout. Rotating a phone also flipped it into tablet mode for good.
* The Victron system diagram now scales as one piece. All the connection
  lines stay lined up on any screen instead of being fixed to one
  resolution, and it no longer runs under the tab bar.
* Rebuilt the Lights screen with flexible columns. While fixing it I
  found that Awning, Porch and Hitch lights were unreachable before,
  because a fixed card height was cutting them off.
* Fixed the Climate screen so the Auxiliary card and the fan speed list
  are no longer cut off. The Auto fan button was invisible before.

Bugs found and fixed along the way:

* The lights tab was labelled System and opened the wrong screen.
* The Wifi tile on the home screen opened the Awning controls.
* Battery charge showed values like 8040 percent because the number was
  turned into a percentage twice.
* Changing fan speed and getting an error put back the wrong speed.
* A warning about text strings appeared on every launch, caused by a
  couple of stray spaces in the JSX.

### 2. Authentication (branch alireza/auth)

The server accepted any command from anyone on the RV network. Now
devices pair with a PIN and every control request needs a token.

* New file server/auth.js for the Pi. It adds login, verify, logout and
  a device list, and blocks every control route without a valid token.
  Tokens last 24 hours and survive a server restart.
* Two permission levels. Owners can do everything. Guests can use the
  normal controls but cannot send raw CAN commands.
* New login screen in the app with the PIN, a device name, an option to
  change the server address, and a demo mode that runs the app on
  simulated data with no server.
* The app remembers the session, checks the token on startup, and signs
  out from Settings.
* Turning it on takes two lines in the Pi's server.js. The steps are in
  server/AUTH_INTEGRATION.md.

Important for whoever deploys this: the server and the app have to be
updated together. If the Pi requires tokens and someone is running the
old app, they cannot get past the login screen.

The PINs are still the defaults (1234 and 0000) and need to be changed
on the real RV Pi.

### 3. Add Device (branch alireza/add-device)

The Add Device button on the Devices screen did nothing. It now opens a
form where you give the device a name, choose whether it is a latch or a
dimmable light, and enter its RV-C instance number in hex. The form shows
the exact CAN frame it will send before you save. Saved devices are kept
on the tablet, appear under Custom Devices, and toggle through the
existing raw CAN endpoint.

The Devices screen is also reachable on tablets now. It was only on
phones before.

### 4. Live GPS (branch alireza/live-gps)

The map only asked for the location once when it loaded, so it never
moved after that, and if location permission was denied the user just saw
an empty map.

* The map now follows the RV, with a new fix every 2 seconds or 5 metres.
* Tapping the map opens a full screen Live Location view with the
  coordinates, speed, heading, altitude, GPS accuracy and how old the
  last fix is.
* Permission problems now show in the app with a retry button.
* The map honestly says it is still acquiring instead of reporting the RV
  as parked when it has no position yet.

## Testing

Everything was tested on two Android emulators, a 7 inch tablet at
1280x800 and an 11 inch iPad size at 2360x1640.

The authentication work was also tested against a real Raspberry Pi. I
set up a Pi 3 with the project server plus the new auth module running as
a service, and confirmed from the app that login works, that the token is
sent with every request, that a guest is refused raw CAN access, and that
a custom device toggle reaches the Pi and runs the right cansend command.
The command only failed at the last step because that Pi has no CAN
adapter, which is expected.

## What still needs the RV

* Confirming a custom device actually switches its light on the real bus.
* Logging in over the RV WiFi.
* Changing the PINs on the RV Pi.

## Branches

They build on each other in this order:

```
7InchRVTablet
  alireza/responsive
    alireza/auth
      alireza/add-device
        alireza/live-gps
```

Merging alireza/live-gps brings in all of it. Nothing is merged yet
because the authentication change needs the app and the Pi to be updated
in the same session. INTEGRATION_NOTES.md has the details.

All four tasks are done on my end and ready to review. Happy to walk
through any of it or help with the merge whenever it suits.
