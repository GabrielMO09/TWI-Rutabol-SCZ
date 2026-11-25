import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// Con NEXT_PUBLIC_API_URL relativo ("/api", producción en Vercel) el navegador solo habla con 'self'.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const apiOrigin = apiUrl.startsWith("/")
  ? "'self'"
  : (() => {
      try {
        return new URL(apiUrl).origin;
      } catch {
        return "http://localhost:3001";
      }
    })();
// Backend real al que Vercel reenvía /api/* (misma origin => la cookie SameSite=Lax viaja).
const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

// shortcut: script-src y style-src con unsafe-inline porque Next/Leaflet inyectan inline; endurecer con nonces cuando se pruebe en navegador.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  `connect-src 'self' ${apiOrigin} https://router.project-osrm.org${isDev ? " ws://localhost:3000 ws://rutabol.scz:3000" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["rutabol.scz"], // acceso por BIND9 (rutabol.scz) en desarrollo
  async rewrites() {
    return backendUrl ? [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }] : [];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
    instantInsights: { validationLevel: "manual-warning" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
