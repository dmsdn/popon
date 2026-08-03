// app/layout.tsx
// 루트 레이아웃 - 다크모드 고정(라이트모드 없음), 세로로 들면 "가로로 돌려주세요"
// 안내로 화면을 덮는 orientation-lock 대체 처리를 포함해요.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "팝온 현장 웨이팅",
  description: "현장 웨이팅 등록",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark h-full antialiased">
      <body className="h-full bg-background text-foreground overflow-hidden">
        {/* 세로로 들었을 때 뜨는 안내 - CSS만으로는 진짜 orientation lock이 안 되니,
            세로일 때 이 화면으로 덮어서 사실상 가로로만 쓰도록 유도해요. */}
        <div
          id="rotate-notice"
          className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-background px-8 text-center"
        >
          <div className="text-5xl">📱↻</div>
          <p className="text-lg font-bold">태블릿을 가로로 돌려주세요</p>
          <p className="text-sm text-gray-400">이 화면은 가로 모드에서만 사용할 수 있어요.</p>
        </div>
        <div id="checkin-app" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
