/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip static optimization for dynamic pages to prevent build-time API calls
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig