# Setting up the tablet emulators

How to get an Android emulator to match the exact screen sizes we are
building for. The Android Studio interface does not let you set a custom
dpi, so the screen never matches what the handoff document asks for. The
way around it is to create the emulator normally and then edit its config
file by hand.

These are the two sizes we need:

| Emulator | Resolution | Density | Landscape size in dp |
|---|---|---|---|
| iPad Air 11 inch | 2360 x 1640 | 320 | 1180 x 820 |
| 7 inch wall tablet | 800 x 1280 | 213 | 1280 x 800 |

## Steps

### 1. Create the emulator

In Android Studio, open Device Manager and create a device as normal.
Pick any tablet profile, for example Pixel Tablet, and a system image
such as Android 16 with Google APIs (x86_64). The screen size you pick
here does not matter because we are about to replace it.

### 2. Close Android Studio

This matters. Android Studio keeps the emulator settings in memory and
will write over your changes if it is still open.

### 3. Open the config file

```
C:\Users\<yourname>\.android\avd\<AvdName>.avd\config.ini
```

### 4. Change the screen settings

For the iPad Air 11 inch:

```
hw.lcd.width = 2360
hw.lcd.height = 1640
hw.lcd.density = 320
skin.name = 2360x1640
skin.path = _no_skin
```

For the 7 inch wall tablet:

```
hw.lcd.width = 800
hw.lcd.height = 1280
hw.lcd.density = 213
skin.name = 800x1280
skin.path = _no_skin
```

The line that usually fixes it is `skin.path = _no_skin`. If a skin is
set, it forces its own resolution and ignores whatever you put in the
width, height and density lines. That is normally why the size does not
match.

One more setting worth adding, so you can type with your real keyboard
instead of the on screen one:

```
hw.keyboard = yes
```

Note: the 7 inch size is also close to the Nexus 7 profile that comes
with Android Studio, so you can start from that one and only change the
density if you prefer.

### 5. Reopen Android Studio and start the emulator

It should now boot at the size you set.

## Things that tripped me up

**Duplicate lines.** Make sure each setting appears only once in the
file. If you paste the block in rather than editing the existing lines,
you can end up with the same setting twice and the emulator uses
whichever one it reads last.

**The app opens sideways the first time.** It looks letterboxed in a
portrait window. Rotate the emulator to landscape, then fully close the
app and open it again. It lays out correctly after that. Rotating alone
is not enough, the app has to restart.

**Checking it worked.** Once the emulator is running you can confirm the
real values with:

```
adb shell wm size
adb shell wm density
```

## Useful commands

Take a screenshot, which is handy for comparing layouts between the two
sizes:

```
adb exec-out screencap -p > screenshot.png
```

Rotate to landscape without touching the emulator window:

```
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
```

Use `user_rotation 0` to go back to portrait.
