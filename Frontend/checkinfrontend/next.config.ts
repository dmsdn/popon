import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 백엔드로 프록시 - customerfrontend와 동일한 백엔드를 그대로 씀
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
