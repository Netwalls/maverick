const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: [],
  webpack: (config) => {
    const webNodeModules = path.resolve(__dirname, 'node_modules');
    const solanaWeb3Entry = require.resolve('@solana/web3.js', { paths: [webNodeModules] });
    const splTokenEntry = require.resolve('@solana/spl-token', { paths: [webNodeModules] });
    const bs58Entry = require.resolve('bs58', { paths: [webNodeModules] });
    const dotenvEntry = require.resolve('dotenv', { paths: [webNodeModules] });

    // Allow importing TypeScript files from parent src/ directory
    config.resolve.modules = [
      webNodeModules,
      ...(config.resolve.modules || []),
      path.resolve(__dirname, '..'),
    ];

    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@solana/web3.js$': solanaWeb3Entry,
      '@solana/spl-token$': splTokenEntry,
      'bs58$': bs58Entry,
      'dotenv$': dotenvEntry,
    };

    // The parent src/ files use .js extensions in imports (Node ESM convention)
    // but the actual files are .ts. This plugin rewrites .js -> .ts at resolve time.
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };

    return config;
  },
};

module.exports = nextConfig;
