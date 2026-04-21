import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@kairos/types', '@kairos/ui', '@kairos/api-client'],
  eslint: {
    // Lint is already run as a separate turbo task — skip during `next build`
    ignoreDuringBuilds: true,
  },
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
};

export default nextConfig;
