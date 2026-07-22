import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 통합 백엔드(8080)로 프록시 — 브라우저가 same-origin(5173)으로 호출하므로 CORS가 발생하지 않음
  // (popupfrontend의 Vite dev proxy와 같은 역할)
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
