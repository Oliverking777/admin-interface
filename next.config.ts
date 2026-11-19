import type { NextConfig } from "next";

/**
 * Where the Spring Boot backend runs (server-side only, never sent to the browser).
 * Set API_PROXY_TARGET in .env.local / your hosting environment. TODO: adjust the default port.
 */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",

  // Remote images that next/image may load. Keep in sync with ALLOWED_IMAGE_HOSTS
  // in components/products/ProductImage.tsx.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // The browser calls /yah/... on the Next.js origin; Next forwards it to the backend.
  // Same origin means no CORS, and the session cookie stays first-party.
  async rewrites() {
    return [
      {
        source: "/yah/:path*",
        destination: `${API_PROXY_TARGET}/yah/:path*`,
      },
    ];
  },
};

export default nextConfig;