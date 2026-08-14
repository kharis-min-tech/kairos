# Maestro E2E — Kairos mobile

Golden-path flows for the mobile app. Two entry points, sharing the same UI subflows:

- `golden-path.yaml` — targets a **native build** (`com.kharis.kairos`). Cleanest, fastest, closest to production.
- `golden-path-expo-go.yaml` — targets **Expo Go** and loads the project via a Metro deep link. Zero build required; works with the same setup you use for `npx expo start`.

The four UI subflows (`00-onboarding`, `10-login`, `20-tab-navigation`, `30-sign-out`) are shared — they drop `appId` from their frontmatter and inherit from the parent flow.

A broader **wave-navigation** flow layers on top of the golden path — it re-uses onboarding + login, walks every screen shipped in the 2026-08 Wave 1 + Wave 2 web-parity push (GDPR, notif prefs, forms, my-submissions, my-groups, members directory, rollcall, reports), then signs out. Two entry points, same shape:

- `wave-navigation.yaml` — native build.
- `wave-navigation-expo-go.yaml` — Expo Go via Metro deep link.

Run with `npm run e2e:waves` or `npm run e2e:waves:expo-go` (same env args as the golden path — see below). Individual wave subflows (`40-more-menu`, `41-wave1-selfservice`, `42-forms`, `43-my-groups`, `44-members-directory`, `45-rollcall-smoke`, `46-reports`) can each be run in isolation with `maestro test .maestro/<file>.yaml --env APP_ID=<bundle>` while signed in on the More tab.

A **wave3-navigation** flow covers everything shipped in the 2026-08-12 admin CRUD wave (Fellowships / Departments / Members create forms; Branches + Regions; Outreach + Souls; Security hub + change-password/email; My attendance). Same shape:

- `wave3-navigation.yaml` — native build.
- `wave3-navigation-expo-go.yaml` — Expo Go via Metro deep link.

Run with `npm run e2e:wave3` or `npm run e2e:wave3:expo-go`. Individual subflows: `50-fellowships-crud`, `51-departments-crud`, `52-members-crud`, `53-branches-regions`, `54-outreach-souls`, `55-security-attendance`. Wave 3 subflows target the "+" header buttons on list screens via `testID` (`new-fellowship-btn`, `new-department-btn`, `new-branch-btn`, `new-member-btn`, `new-outreach-btn`, `new-region-btn`) — keep those testIDs stable when refactoring or the flows will hang on tapOn.

## Install Maestro

Maestro is a native CLI (not npm).

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
# adds ~/.maestro/bin to PATH — re-source your shell or open a new terminal
```

Verify:

```bash
maestro --version
```

## Device-side setup (WSL2 → physical Android phone)

This is the working path for this repo. iOS requires macOS + Xcode and can't be driven from WSL2 — see the "iOS notes" section at the bottom.

### One-time: enable developer options on the phone

1. **Settings → About phone → tap `Build number` seven times** → "You are now a developer!"
2. **Settings → System → Developer options** → toggle:
   - `USB debugging` — on
   - `Wireless debugging` — on (Android 11+; older Android needs the USB path below)

### One-time: install adb inside WSL2

```bash
sudo apt update && sudo apt install -y android-tools-adb
adb --version   # should print "Android Debug Bridge version 1.0.x"
```

Reusing the Windows-side `adb.exe` from Android Studio's platform-tools also works, but a WSL-native adb is simpler because Maestro shells out to `adb` from the same process.

### Every session: pair + connect over Wi-Fi

Phone and WSL2 host must be on the same Wi-Fi network.

```bash
# On the phone: Developer options → Wireless debugging → "Pair device with pairing code".
# Phone displays: IP:PORT and a 6-digit code.

adb pair <phone-ip>:<pair-port>
# prompts: Enter pairing code: <6-digit code>

# Then reconnect on the main port (shown at the top of the Wireless debugging screen):
adb connect <phone-ip>:<connect-port>

adb devices
# should list your phone as: <phone-ip>:<connect-port>  device
```

Pairing only needs to happen once per WSL2 install — subsequent sessions can go straight to `adb connect`. But WSL2's networking sometimes forgets, so if `adb devices` shows nothing or `offline`:

```bash
adb kill-server && adb start-server
adb connect <phone-ip>:<connect-port>
```

### Sanity check: Maestro sees the device

```bash
maestro test --help   # should succeed
maestro hierarchy     # dumps the current foregrounded app's view tree
```

If `maestro hierarchy` prints XML, you're good. If it says "No devices connected", `adb devices` isn't seeing the phone — retry the pair/connect above.

### Then: run E2E

From `apps/mobile/`, with Metro already running (`npx expo start` + the cloudflared bridge from the mobile v1 handoff):

```bash
npm run e2e:expo-go -- \
  --env METRO_URL="exp://<subdomain>.trycloudflare.com" \
  --env EMAIL=<staging-email> \
  --env PASSWORD=<staging-password> \
  --env BRANCH_NAME=Kharis
```

### iOS notes

Maestro on iOS drives the device via WebDriverAgent, which needs a macOS host with Xcode. From WSL2 that's not reachable. Options if iOS coverage matters:

- Run Maestro from a Mac with `idevice_id -l` seeing the phone.
- Run against an iOS Simulator (macOS-only).
- BrowserStack App Automate / Sauce Labs have hosted Maestro cloud runners — no local iOS setup needed.

For now, treat Android as the E2E target and lean on manual QA + unit tests for iOS parity.

## Path A — against Expo Go (no build required)

**Setup:**

1. Expo Go installed on the device.
2. `npx expo start` running (typically via cloudflared/tunnel on WSL2 — see the `EXPO_PACKAGER_PROXY_URL` workaround in the mobile v1 handoff).
3. The Metro URL that the device can actually reach:
   - LAN mode: `exp://<host-lan-ip>:8081`
   - Cloudflared: `exp://<subdomain>.trycloudflare.com` (no `:port`)
4. A staging user's email + password.
5. Device connected to the same host Maestro is running on:
   - Android: USB debugging on + `adb devices` shows it, OR wireless debugging + `adb connect <phone-ip>:5555`.
   - iOS: Xcode/`idevice_id -l` must see it (macOS-only).

**Run:**

```bash
npm run e2e:expo-go -- \
  --env METRO_URL="exp://<subdomain>.trycloudflare.com" \
  --env EMAIL=<staging-email> \
  --env PASSWORD=<staging-password> \
  --env BRANCH_NAME=Kharis
```

For the broader wave-navigation flow, swap the script name — same env args:

```bash
npm run e2e:waves:expo-go -- \
  --env METRO_URL="exp://<subdomain>.trycloudflare.com" \
  --env EMAIL=<staging-email> \
  --env PASSWORD=<staging-password> \
  --env BRANCH_NAME=Kharis
```

For **iOS Expo Go** add `--env EXPO_GO_APP_ID=host.exp.Exponent` (capital E).
The default is Android (`host.exp.exponent`, lowercase).

**What this flow does:**

1. Launches Expo Go with `clearState: true` + `clearKeychain: true` (wipes both AsyncStorage and SecureStore for hosted projects — this is why you get a genuine first-run).
2. `openLink: ${METRO_URL}` → Expo Go picks up the deep link and loads your project bundle.
3. Waits up to 2 minutes for the splash's `KAIROS` wordmark (accommodates first-load bundle compile).
4. Runs the four UI subflows.

## Path B — against a native build (dev-client / preview / production)

**Setup:**

Build and install one of:

- Local: `npx expo prebuild && npx expo run:android` (requires Android SDK) or `npx expo run:ios` (requires Xcode / macOS).
- EAS: `eas build --profile development --platform android` (or `ios`) — needs `EXPO_TOKEN` if you don't have password login. Install the resulting APK / IPA on the device.

Then:

```bash
npm run e2e -- \
  --env EMAIL=<staging-email> \
  --env PASSWORD=<staging-password> \
  --env BRANCH_NAME=Kharis
```

The flow launches `com.kharis.kairos` directly and clears its own state / keychain — no Metro deep link needed.

## Run one subflow in isolation

```bash
maestro test .maestro/10-login.yaml --env EMAIL=x --env PASSWORD=y
```

Subflows assume the app is already foregrounded. For debugging you'll usually
also want to launch it first — Maestro Studio (below) is the easier path.

## Studio mode (interactive debugging)

```bash
npm run e2e:studio
```

Opens a browser with a live element tree — useful for finding new selectors when the UI drifts.

## Notes on stability

- `BRANCH_NAME` narrows the branch-picker search to a known seed value. The default `Kharis` works against the staging seed. Change it if you're pointing at a differently-seeded environment.
- The login flow uses `testID` selectors (`login-email`, `login-password`) so it survives copy changes on the sign-in screen. When adding new critical inputs (search fields, checkout forms, etc.), prefer adding a `testID` upfront over depending on visible text.
- Waits for the splash use a 2-minute timeout on the Expo Go path — first-load bundle compile can be slow on cold Metro.
