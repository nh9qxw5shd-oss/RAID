/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Loaded at runtime for server-side PDF rendering — must not be bundled.
    serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  },
}

module.exports = nextConfig
