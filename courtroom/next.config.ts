import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @trial/shared ships TypeScript source, not a build.
  transpilePackages: ['@trial/shared'],
  reactStrictMode: true,
  webpack: (config) => {
    // @trial/shared uses NodeNext-style `./x.js` specifiers that point at `.ts` files.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
