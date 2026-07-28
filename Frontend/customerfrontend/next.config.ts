import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8080/api/:path*" },
      // 주최자가 등록한 팝업 이미지(popup_image)는 백엔드가 /uploads 로 서빙한다.
      // 지금 DB에는 base-url 설정 때문에 절대주소(http://localhost:8080/uploads/…)가 저장돼 있어
      // 이 프록시를 타지 않지만, 배포 시 상대경로(/uploads/…)로 바꾸면 그대로 동작한다.
      { source: "/uploads/:path*", destination: "http://localhost:8080/uploads/:path*" },
    ];
  },
};

export default nextConfig;