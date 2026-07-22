import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 소비자 백엔드(8081) — 먼저 매칭되는 규칙이 이깁니다.
      { source: "/api/customer/:path*", destination: "http://localhost:8081/api/customer/:path*" },
      { source: "/api/keywords/:path*", destination: "http://localhost:8081/api/keywords/:path*" },
      // 나머지 /api 전부 → popupbackend(8080): 팝업 목록·슬롯·예약·웨이팅·신고
      { source: "/api/:path*", destination: "http://localhost:8080/api/:path*" },
    ];
  },
};

export default nextConfig;