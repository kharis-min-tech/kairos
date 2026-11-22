import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@kairos/types', '@kairos/ui', '@kairos/api-client'],
  eslint: {
    // Lint is already run as a separate turbo task — skip during `next build`
    ignoreDuringBuilds: true,
  },
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,

  /**
   * Somewhere else to build, so a build cannot wreck a running dev server.
   *
   * `next dev` and `next build` both own `.next`. Running a build while the
   * dev server is up replaces the chunks it has already handed to the
   * browser, and the site then fails with
   * `__webpack_modules__[moduleId] is not a function` and loads no CSS --
   * which looks exactly like a broken stylesheet and is not one. Recovering
   * means stopping the server, deleting `.next` and starting again.
   *
   * Set NEXT_DIST_DIR to build out of the way:
   *
   *   NEXT_DIST_DIR=.next-build npx next build
   *
   * Unset, nothing changes: dev, CI and Docker all keep using `.next`.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
