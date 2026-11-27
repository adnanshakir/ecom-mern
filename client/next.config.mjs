/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },

  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },

  // Proxy /api/* to the backend so httpOnly cookies are same-origin
  // regardless of whether we're running locally or against Render.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://ecom-mern-c5wz.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
