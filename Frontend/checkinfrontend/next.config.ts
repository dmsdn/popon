import type { NextConfig } from "next";

// 이 앱은 **정적 파일로 배포**한다 (8/3).
//
// 세 화면 모두 "use client" 라 서버 렌더링이 필요 없고, 동적 라우트도 없다
// (팝업 선택은 /checkin?popupId=X 쿼리로 받는다). 그래서 Node 프로세스를 띄울
// 이유가 없다 — 주최자·관리자 앱과 같이 nginx가 파일만 내려 주면 된다.
// 프론트 EC2는 RAM 1GB에 이미 nginx + 소비자 앱(Node)을 돌리고 있어서,
// 프로세스를 하나 더 얹지 않는 편이 안전하다.
//
// ⚠ output:"export" 에서는 rewrites()가 동작하지 않는다.
//   원래 여기 있던 `/api/* → localhost:8080` 프록시는 **배포에서는 nginx가** 대신한다
//   (checkin.3.35.16.87.nip.io 서버 블록의 location /api/).
//   로컬 개발(next dev)에서는 export 설정이 적용되지 않고 rewrites만 살아나므로,
//   아래 프록시를 그대로 둬야 팀원들이 지금까지처럼 개발할 수 있다.
const nextConfig: NextConfig = {
  output: "export",

  // 로컬 개발용 프록시 (배포 빌드에서는 무시됨 — 위 주석 참고)
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
