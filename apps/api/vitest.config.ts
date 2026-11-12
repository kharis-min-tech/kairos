import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Dynamic `await import('./service')` inside the first test of a describe
    // block routinely exceeds the 5s default on WSL2 cold imports.
    testTimeout: 15_000,
    // The same reasoning, applied to hooks, which it originally was not.
    //
    // `oauth-server/flow.test.ts` does its dynamic `await import('../app')` in
    // `beforeAll`, which pulls in the whole router tree and compiles pglite's
    // WASM. Warm that takes about 8.5s; cold — a fresh `npm ci`, a cleared
    // cache, or simply running under `turbo` alongside the other packages —
    // it exceeds the 10s hook default and the suite reports 41 skipped tests
    // and a failed suite.
    //
    // It presents as a flaky test and is not one: it is a fixed cost measured
    // against a timeout that was never raised with its sibling. Diagnosed
    // three times before anyone changed the number.
    hookTimeout: 30_000,
  },
});
