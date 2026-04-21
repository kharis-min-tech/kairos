import type { NextConfig } from 'next';

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  transpilePackages: ['@kairos/types', '@kairos/ui', '@kairos/api-client'],
  eslint: {
    // Lint is already run as a separate turbo task — skip during `next build`
    ignoreDuringBuilds: true,
  },
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
