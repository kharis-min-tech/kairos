import Constants from 'expo-constants';

/**
 * Runtime config from app.config.ts `extra` (populated at build time
 * from EXPO_PUBLIC_API_URL). Set per profile:
 *   local   → http://localhost:3001
 *   staging → https://api-staging.kairos.kharis.org  (TBC)
 *   prod    → https://api.kairos.kharis.org         (TBC)
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };

export const apiBaseUrl: string = extra.apiBaseUrl ?? 'http://localhost:3001';
