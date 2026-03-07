const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  webpack: (config) => {
    // Allow importing TypeScript files from parent src/ directory
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, '..'),
    ];

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
