import type { NextConfig } from 'next';

const MM_INTERNAL_URL = process.env.MATTERMOST_INTERNAL_URL ?? 'http://localhost:8065';

const nextConfig: NextConfig = {
  transpilePackages: ['@kairos/types', '@kairos/ui', '@kairos/api-client'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Prevent Next.js from 308-redirecting /mm/ → /mm, which creates a loop
  // with Mattermost's own 302 /mm → /mm/
  skipTrailingSlashRedirect: true,
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  async rewrites() {
    return [
      // Proxy /mm and /mm/* to MM, preserving the /mm prefix.
      // MM's SiteURL is set to http://localhost:3002/mm so it generates
      // all paths with /mm prefix — Next.js just tunnels them through.
      // /mm  — exact match (MM redirects this to /mm/)
      {
        source: '/mm',
        destination: `${MM_INTERNAL_URL}/mm`,
      },
      // /mm/ — trailing slash, no further segments (:path* requires at least one)
      {
        source: '/mm/',
        destination: `${MM_INTERNAL_URL}/mm/`,
      },
      // /mm/anything
      {
        source: '/mm/:path*',
        destination: `${MM_INTERNAL_URL}/mm/:path*`,
      },
    ];
  },
};

export default nextConfig;
