// app/layout.tsx
// 루트 레이아웃 - 다크모드 고정(라이트모드 없음)

import type { Metadata } from "next";
import "./globals.css";
import TouchActivation from "./TouchActivation";

export const metadata: Metadata = {
  title: "팝온 현장 웨이팅",
  description: "현장 웨이팅 등록",
  // [수정] 파비콘 - Next.js의 app/icon.svg 자동 인식 방식으로 변경, 중복 설정으로 인한 충돌 가능성을 방지
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark h-full antialiased">
      {/* iOS Safari에서 :active 스타일이 정상 작동하도록 터치 활성화 처리를 클라이언트 컴포넌트로 분리해 빌드 오류를 해결 */}
      <body className="h-full bg-background text-foreground overflow-hidden">
        <TouchActivation />
        <div id="checkin-app" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
