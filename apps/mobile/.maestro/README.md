# Maestro E2E — Kairos mobile

Golden-path flows for the mobile app. Two entry points, sharing the same UI subflows:

- `golden-path.yaml` — targets a **native build** (`com.kharis.kairos`). Cleanest, fastest, closest to production.
- `golden-path-expo-go.yaml` — targets **Expo Go** and loads the project via a Metro deep link. Zero build required; works with the same setup you use for `npx expo start`.

The four UI subflows (`00-onboarding`, `10-login`, `20-tab-navigation`, `30-sign-out`) are shared — they drop `appId` from their frontmatter and inherit from the parent flow.

## Install

Maestro is a native CLI (not npm).

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

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
