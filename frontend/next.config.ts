import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Rewrites
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL}/:path*` || "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;
