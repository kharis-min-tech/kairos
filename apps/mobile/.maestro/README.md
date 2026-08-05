# Maestro E2E — Kairos mobile

Golden-path flows for the mobile app. These do not run in CI yet; the mobile pipeline (`turbo test`) covers unit-level only.

## Install

Maestro is a native CLI (not npm).

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

## What you need

- An iOS Simulator, Android emulator, or a physical device connected via USB with dev debugging enabled.
- A build of the app installed on that device with bundle id `com.kharis.kairos`. Expo Go is NOT sufficient because the launched process id is Expo Go's, not the Kairos app id. Options:
  - `eas build --profile development --platform ios|android` (dev client), or
  - `npx expo run:ios` / `npx expo run:android` (local native build).
- A staging user's email + password.

## Run the full golden path

From `apps/mobile/`:

```bash
npm run e2e -- \
  --env EMAIL=<staging-email> \
  --env PASSWORD=<staging-password> \
  --env BRANCH_NAME=Kharis
```

`BRANCH_NAME` narrows the branch-picker search to a real seed value; the default `Kharis` works against the staging seed. Change it if you're testing against a differently-seeded environment.

That runs `.maestro/golden-path.yaml`, which composes:

1. `00-onboarding.yaml` — splash → language → branch → login screen
2. `10-login.yaml` — signs in with `${EMAIL}` / `${PASSWORD}`
3. `20-tab-navigation.yaml` — Home → Community → Check-in → Give → More
4. `30-sign-out.yaml` — sign out via More, back to login

## Run one flow in isolation

```bash
maestro test .maestro/00-onboarding.yaml
maestro test .maestro/10-login.yaml --env EMAIL=x --env PASSWORD=y
```

## Studio mode (interactive debugging)

```bash
maestro studio
```

Opens a browser with a live element tree — useful for finding new selectors when the UI drifts.

## Notes

- `00-onboarding.yaml` calls `launchApp: clearState: true clearKeychain: true` — so it always starts from first-run. If you want to test the returning-user path (splash → straight to tabs), skip that flow and run `20-tab-navigation.yaml` directly.
- Selectors are text-based, not `testID`-based. If a screen's labels change, update the corresponding flow file. When adding new screens, prefer `accessibilityLabel` on interactive elements to make future flows resilient.
