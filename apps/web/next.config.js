/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kbase/types', '@kbase/utils'],
};

module.exports = nextConfig;
