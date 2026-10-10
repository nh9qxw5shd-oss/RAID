// RAID is mounted under /raid on the Derby Control hub (PotatOS), which proxies /raid/* to this
// deployment. basePath keeps every route, asset and API under that prefix on the standalone
// hostname too, so the same build serves both. NEXT_PUBLIC_BASE_PATH is exposed for the places
// that build a URL by hand (lib/basePath.ts).
const BASE_PATH = '/raid'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  async redirects() {
    // The standalone hostname keeps working: its root, bookmarks, and the respond / debrief
    // links in publish emails and QR codes sent before the mount land on the same page.
    return [
      { source: '/', destination: BASE_PATH, basePath: false, permanent: false },
      { source: '/:page(respond|debrief|print|settings)', destination: `${BASE_PATH}/:page`, basePath: false, permanent: false },
      { source: '/:page(respond|debrief|print|settings)/:rest*', destination: `${BASE_PATH}/:page/:rest*`, basePath: false, permanent: false },
    ]
  },
  experimental: {
    // Loaded at runtime for server-side PDF rendering — must not be bundled.
    serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  },
}

module.exports = nextConfig
