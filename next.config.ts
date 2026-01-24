import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // NOTE: 'unsafe-inline' required for Next.js 16 hydration scripts
              "script-src 'self' 'unsafe-inline'",
              // NOTE: 'unsafe-inline' required for Tailwind v4 runtime CSS injection
              "style-src 'self' 'unsafe-inline'",
              // Allow images from data URIs and HTTPS
              "img-src 'self' data: https:",
              // Allow fonts from data URIs
              "font-src 'self' data:",
              // Restrict API calls to same origin
              "connect-src 'self'",
              // Media: same origin only
              "media-src 'self'",
              // Workers: same origin only
              "worker-src 'self'",
              // Block all plugins
              "object-src 'none'",
              // Prevent base tag injection
              "base-uri 'self'",
              // Restrict forms to same origin
              "form-action 'self'",
              // Prevent clickjacking
              "frame-ancestors 'none'",
              // Upgrade HTTP to HTTPS
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
