/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile Self Protocol SDK (ships ESM-only modules)
  transpilePackages: ["@selfxyz/qrcode", "@selfxyz/sdk-common"],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    // MetaMask SDK references React Native storage — stub it out in browser builds
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;

    // Suppress the "Critical dependency: the request of a dependency is an expression"
    // warning from ox/tempo/virtualMasterPool.js (transitive dep via viem → coinbase-sdk
    // → @base-org/account → @wagmi/connectors). It is a worker file that never runs in
    // the browser and the dynamic require is intentional — safe to ignore.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /ox\/_esm\/tempo\/internal\/virtualMasterPool/ },
    ];

    return config;
  },
  // Silence the Chrome DevTools well-known endpoint 404 noise
  async rewrites() {
    return [
      {
        source: '/.well-known/appspecific/com.chrome.devtools.json',
        destination: '/api/devtools-stub',
      },
    ];
  },
};

module.exports = nextConfig;
