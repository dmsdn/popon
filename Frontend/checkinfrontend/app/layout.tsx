// app/layout.tsx
// 루트 레이아웃 - 다크모드 고정(라이트모드 없음).
// [수정] 이제 세로/가로 모드를 둘 다 지원해서, 더 이상 "가로로 돌려주세요"
// 안내로 화면을 막지 않아요. 각 페이지가 orientation에 따라 스스로 레이아웃을
// 바꾸도록(landscape: 접두사) 처리했어요.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "팝온 현장 웨이팅",
  description: "현장 웨이팅 등록",
  // [수정] 파비콘은 app/icon.svg 파일 컨벤션으로 처리해요 - Next.js가 자동으로
  // 인식해서 <link rel="icon">을 넣어줘서, 여기서 수동으로 지정 안 해도 돼요
  // (수동 설정과 같이 쓰면 오히려 충돌할 수 있어요).
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark h-full antialiased">
      <body className="h-full bg-background text-foreground overflow-hidden">
        <div id="checkin-app" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
