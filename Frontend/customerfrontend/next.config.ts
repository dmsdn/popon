import type { NextConfig } from "next";

// 프록시가 바라볼 백엔드 주소. 기본은 로컬, .env.local의 BACKEND_ORIGIN이 있으면 그걸 쓴다.
//   로컬 개발  → 아무것도 안 하면 http://localhost:8080
//   배포 백엔드 → .env.local 에 BACKEND_ORIGIN=http://3.35.218.209:8080
// .env.local은 gitignore 대상이라 각자 환경을 커밋 없이 바꿀 수 있다. (7/30 EC2 배포)
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

// 어느 백엔드를 보고 있는지 dev 서버 기동 로그에 찍어둔다.
// 프록시 대상이 조용히 localhost로 떨어지면 원인 찾기가 까다로워서 눈에 보이게 남긴다.
console.log(`[next.config] 백엔드 프록시 대상: ${BACKEND_ORIGIN}`);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
      // 주최자가 등록한 팝업 이미지(popup_image)는 백엔드가 /uploads 로 서빙한다.
      // 7/30부터 file.base-url이 상대경로(/uploads)라 DB에도 "/uploads/…"가 저장되고,
      // 브라우저 요청이 이 프록시를 그대로 탄다.
      // (그 전에는 절대주소가 저장돼 브라우저가 백엔드로 직행했고, 서버 주소가 바뀌면
      //  popup_image·banner·business·review_image의 기존 행을 전부 UPDATE해야 했다.)
      { source: "/uploads/:path*", destination: `${BACKEND_ORIGIN}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
