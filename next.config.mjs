/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), payment=()",
  "X-DNS-Prefetch-Control": "off",
};

// CSP aplicada solo en producción: en desarrollo Next necesita
// scripts/style inline y WebSocket de HMR.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.googleusercontent.com https://www.gstatic.com",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://generativelanguage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com https://accounts.google.com https://www.gstatic.com http://127.0.0.1:8000 http://localhost:8000",
  "frame-src 'self' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://soundcraft-ai-b6507.firebaseapp.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    const extra = isProd
      ? [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : [];
    return [
      {
        source: "/:path*",
        headers: [
          ...Object.entries(securityHeaders).map(([key, value]) => ({
            key,
            value,
          })),
          ...extra,
        ],
      },
    ];
  },
};

export default nextConfig;