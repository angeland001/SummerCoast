# SummerCoast RV App: Summer Development Report

**Tasks completed:** Weather Auto-Refresh, Light Scheduling Modal UI, Energy Charts Screen
**Devices used for testing:** Motorola phone (5.8", Android) and Samsung Galaxy Tab S9 FE
**Environment:** Expo dev server on Windows; Raspberry Pi backend NOT available on my home network, so all hardware calls fail with network errors as expected and the Victron service runs in simulation mode. The handoff document says to expect exactly this.

---

## Task 1: Weather Auto-Refresh

**Files changed:** `screens/Home.jsx`, `helper/weather/weatherHelpers.js`

**Problem:** Weather was fetched once when the Home screen mounted and never again, so it went stale on long trips. The location was also hardcoded to Chattanooga.

**What I did:**

- Moved `loadWeatherData` out of the `useEffect` so three callers can share it: the initial load, a new 30-minute `setInterval` (with `clearInterval` cleanup), and pull-to-refresh.
- Added pull-to-refresh by wrapping the mobile content in a `ScrollView` with a `RefreshControl`. Learned along the way that `tintColor` is iOS-only; on Android you need `colors` and `progressBackgroundColor`, and my first spinner color was invisible on the dark background, so it's now the app's orange accent.
- Fixed a layout bug the ScrollView introduced: `flex: 1` + `justifyContent: 'flex-end'` on the content, combined with `flexGrow: 1` on the ScrollView, forced content to exactly screen height, so anything taller clipped off the top (the forecast title was cut in half) and couldn't scroll. Moving `justifyContent` to the ScrollView's `contentContainerStyle` and removing `flex: 1` fixed it.
- GPS-based weather (the handoff's optional suggestion): request foreground permission, get position with `Accuracy.Balanced` (weather doesn't need meter precision, and it's faster and lighter on battery), fetch by coordinates through a new `fetchHourlyWeatherByCoords(lat, lon)` helper, and show the API's returned city name in the header. If anything fails, permission denied, GPS off, network, it falls back to the original Chattanooga fetch, so the worst case is identical to the old behavior.
- In the helper file, extracted the shared filter/sort/slice logic into `processForecastList()` used by both fetch functions. `fetchHourlyWeather` is unchanged from the outside, so other screens that import it are unaffected.

**A bug I hit:** importing the new helper from `"../helper"` returned undefined (`fetchHourlyWeatherByCoords is not a function`) because the helper index re-exports functions by name and mine wasn't listed. My fallback caught it: the app kept working on Chattanooga weather, and I fixed it by importing directly from `"../helper/weather/weatherHelpers"` instead of touching the shared index.

**Testing:** timer verified with a temporary 10-second interval and `Weather refreshed at:` logs; pull-to-refresh shows the orange spinner and an immediate refresh log; denying permission and turning off device Location both fell back to Chattanooga with a warning and no crash; with permission granted the header shows my actual city.

**Note on accuracy:** the temperatures differ a few degrees from the phone's built-in weather app. That's expected, not a bug: different provider (OpenWeatherMap vs Google/Apple), the `/forecast` endpoint returns predictions in 3-hour blocks (a forecast, not a current observation), and Kelvin→°F conversion rounds with `.toFixed(0)`.

---

## Task 2: Light Scheduling Modal

**Files changed:** `components/ScheduleLightsModal.jsx`, `screens/Devices.jsx`
**Not changed:** `Service/LightSchedulerService.js` (already fully written; reviewed only)

**Problem:** The modal could create schedules but nothing else, no way to see, pause, or delete them. The handoff requires viewing, deleting, and enabling/disabling schedules via the service's `getSchedules()`, `deleteSchedule(id)`, and `toggleSchedule(id)`.

**What I did:**

- Added a third **Saved** tab (next to Individual and Groups) with a live count. A `loadSchedules()` function runs every time the modal opens and after every create/delete/toggle, so the list always mirrors what the service has stored.
- Each schedule card shows the time, an ON/OFF badge, which lights (the room-group name if the lights exactly match a group, otherwise the light name or a count), and repeat status. Controls: an enable/disable switch (disabled schedules dim and show "Paused") and a delete button behind an "Are you sure?" confirmation.
- The create-schedule settings and button hide on the Saved tab, since they only make sense while creating.
- **Wired the modal into the Devices screen**: the handoff claims it "opens from the Devices screen," but nothing opened it; the component was an orphan. Three additions: the import, a visibility state, and a white "Schedule Lights" button above "Add Device" (using a `whiteButton` style that was already sitting unused in the stylesheet, apparently intended for exactly this).

**A service bug I found (documented, not fixed):** `scheduleExecution()` only rolls a passed time to tomorrow for repeating schedules; a one-time schedule set for a time earlier today is silently never armed, while the modal's confirmation message tells the user it "will execute tomorrow." One-line fix (remove `&& schedule.isRepeating`), but I left the working service untouched per the guide and documented the mismatch instead.

**Testing (with terminal log evidence):** created ON and OFF schedules that fired exactly on time (`⏰ Scheduling execution ... in 50s` → `🎬 Executing schedule` → correct CAN commands per light; commands fail with AxiosError only because the Pi is unreachable, the same failure as pressing any light button manually). One-time schedules flip to Paused after firing. Toggle and delete both work and log. Persistence: killed the app completely from recents, reopened, the startup log shows `📥 Loaded 1 schedule(s)` and the Saved tab still lists it, so AsyncStorage persistence and timer re-arming genuinely work. (The `storage modules not available, using memory fallback` warning at startup belongs to RVStateManager's own storage, not the scheduler; it confused me until the kill-and-reopen test proved schedules survive.)

---

## Task 3: Energy Charts

**Files changed:** `components/SystemCharts.jsx` (rewritten), `screens/System.jsx`, `components/EnergyFlowDiagram.jsx`, `getBatterySOC` in the helper
**New dependencies:** `react-native-chart-kit@6.12.0`, `react-native-svg`

**Problem:** The System screen only showed live values, no trends. The handoff asks for time-series charts with persistent history, a 1H/6H/24H selector, and min/max/avg, on "the second swipeable tab," which turned out not to exist: `SystemCharts.jsx` was another orphaned component.

**What I did:**

- **Dependency:** latest chart-kit requires RN 0.81+ and the project is on 0.79.7, so `npm install` failed with ERESOLVE. Pinned `react-native-chart-kit@6.12.0` and installed `react-native-svg` via `npx expo install` so it matches the Expo SDK.
- **Rewrote SystemCharts.jsx to the spec:** polls `VictronEnergyService.getAllData()` every 30 seconds, appends `{timestamp, solar, soc, grid, loads}` readings to AsyncStorage (pruned to 24 hours), loads saved history on mount, draws four `LineChart`s (Solar, Battery SOC, Grid, AC Loads), a 1H/6H/24H selector filtering by timestamp, and Min/Avg/Max boxes per chart for the selected range. Long ranges downsample to ≤48 bucket-averaged points so rendering stays fast. An intentional "Collecting data, N readings so far" state shows before enough readings exist.
- **Wired the swipeable second page into System.jsx:** horizontal `ScrollView` with `pagingEnabled`; page 1 is the existing dashboard untouched, page 2 is the charts. Fixed a rotation bug in the initial wiring (page width captured once from `Dimensions.get` → switched to the live `useWindowDimensions` hook). The pager also applies to the phone layout, a small deviation from "tablet only" that works fine and adds testability.

**Display-bug family found while testing (all fixed, display-time formatting only):** the simulation produces unrounded floats and four components rendered them raw, battery "8390%" (double percent-multiply in `getBatterySOC`; fixed with 0–1 vs 0–100 normalization so it also stays correct on real hardware), solar "1.9400000000000000002kWh" (floating-point accumulation; `.toFixed(2)`), shore power "117.14036734229967V • 60.18…Hz" (`.toFixed(1)`), and the Energy Flow diagram's battery node showing all three raw values overflowing their SVG box (same fixes, which also repaired the layout overlap). These touch stable screens but are pure display corrections of visibly wrong output; before/after screenshots attached.

**Testing:** on the S9 FE, after ~20 minutes the charts had 36 readings drawing real trend lines (solar duty-cycling 0–399W, SOC 80–100%) with sensible Min/Avg/Max; range buttons switch and update the count (ranges only diverge once >1 hour of history exists, which is correct); charts also render on the phone (which caught a stat-label truncation, fixed); all data from the Victron simulation, which the charts can't distinguish from real hardware.


