import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@kairos/types', '@kairos/ui', '@kairos/api-client'],
};

export default nextConfig;
