/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile Self Protocol SDK (ships ESM-only modules)
  transpilePackages: ["@selfxyz/qrcode", "@selfxyz/sdk-common"],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
};

module.exports = nextConfig;
