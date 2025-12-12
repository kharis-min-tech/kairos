/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: [
    '@kairos/shared-types',
    '@kairos/shared-utils',
    '@kairos/ui',
  ],
};

module.exports = nextConfig;
