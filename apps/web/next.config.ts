import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  transpilePackages: ['@kairos/types', '@kairos/ui', '@kairos/utils', '@kairos/api-client'],
};

export default nextConfig;
