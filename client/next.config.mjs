/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
    ],
  },

  // Proxy /api/* to the backend so httpOnly cookies are same-origin
  // regardless of whether we're running locally or against Render.
  // The axios baseURL should be "/api/" (no host) when this proxy is active.
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/:path*",
  //       destination: "https://ecom-mern-c5wz.onrender.com/api/:path*",
  //     },
  //   ];
  // },
};

export default nextConfig;
