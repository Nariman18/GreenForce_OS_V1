import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * The browser only talks to this origin; /api/v1/* is forwarded server-side to the API.
 * Same-origin keeps the httpOnly session cookie first-party and avoids CORS for the app.
 * Note: rewrites are resolved at build time, so API_INTERNAL_URL must be set when building the image.
 */
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '..'),
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiUrl}/api/v1/:path*` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
