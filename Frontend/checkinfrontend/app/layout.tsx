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
      {/* [수정] onTouchStart={() => {}} - iOS Safari(그리고 일부 웹뷰)는 body에 터치
          이벤트 리스너가 하나도 없으면 탭해도 :active(눌림 애니메이션)가
          아예 발동하지 않는 버그가 있어요. 빈 핸들러라도 하나 달아두면
          이 문제가 해결돼서, 태블릿에서 버튼을 탭했을 때도 눌림/살짝 커지는
          애니메이션이 정상적으로 보여요.
          [수정] ontouchstart=""(소문자 HTML 속성, 문자열 값)로 써져 있었는데,
          React/TSX는 이 속성을 인식하지 못하고 camelCase onTouchStart를
          기대해요 - 그것도 문자열이 아니라 함수(이벤트 핸들러)여야 해요.
          그래서 "Did you mean 'onTouchStart'?"라는 타입 에러가 났던 거예요.
          의도(빈 핸들러 하나 달아두기)는 그대로 두고 문법만 고쳤어요. */}
      <body className="h-full bg-background text-foreground overflow-hidden" onTouchStart={() => {}}>
        <div id="checkin-app" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
