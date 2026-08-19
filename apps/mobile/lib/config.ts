import Constants from 'expo-constants';

/**
 * Runtime config from app.config.ts `extra` (populated at build time
 * from EXPO_PUBLIC_API_URL). Set per profile:
 *   local   → http://localhost:3001
 *   staging → https://api-staging.kairos.kharis.org  (TBC)
 *   prod    → https://api.kairos.kharis.org         (TBC)
 */
const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  frontendBaseUrl?: string;
  mapboxPublicToken?: string;
};

export const apiBaseUrl: string = extra.apiBaseUrl ?? 'http://localhost:3001';

/**
 * The base URL the OAuth server callback redirects to
 * (`${FRONTEND_URL}/oauth-callback#...` etc). Needed by the mobile OAuth
 * flow so `WebBrowser.openAuthSessionAsync` knows when to close the browser
 * — the OS then hands the deep-link back to the app via associatedDomains
 * (iOS) or app-link intent filters (Android).
 *
 * Order of preference:
 *   1. explicit `EXPO_PUBLIC_FRONTEND_URL` (matches API's `FRONTEND_URL`)
 *   2. same host as the API when the API is remote (path-based routing:
 *      pages on `/`, Worker on `/api/*` — see [[project-domain-routing]])
 *   3. `http://localhost:3002` (Next dev server) when the API is on localhost
 */
export const frontendBaseUrl: string =
  extra.frontendBaseUrl ??
  (apiBaseUrl.startsWith('http://localhost')
    ? 'http://localhost:3002'
    : apiBaseUrl);

export const mapboxPublicToken: string | undefined = extra.mapboxPublicToken;
