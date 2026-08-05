"use client";

// app/TouchActivation.tsx
// iOS Safari(그리고 일부 웹뷰)는 body에 터치 이벤트 리스너가 하나도 없으면 탭해도
// :active(눌림 애니메이션)가 아예 발동하지 않아요. 빈 리스너라도 하나 달아 두면
// 해결돼서, 태블릿에서 버튼을 탭했을 때 눌림/살짝 커지는 애니메이션이 정상적으로 보여요.
//
// [수정 8/5] 원래는 layout.tsx의 <body>에 onTouchStart={() => {}}로 직접 달았는데,
// layout.tsx는 서버 컴포넌트라 이벤트 핸들러를 prop으로 넘길 수 없어요
// ("Event handlers cannot be passed to Client Component props") - 빌드가 통째로
// 실패했어요. 의도는 그대로 두고, 리스너를 다는 일만 이 클라이언트 컴포넌트가 맡아요.
//
// addEventListener로 직접 다는 편이 오히려 정확해요. passive: true 라서 스크롤을
// 막지 않고, 브라우저에게 "이 리스너는 preventDefault를 부르지 않는다"고 알려 줘요.
import { useEffect } from "react";

export default function TouchActivation() {
  useEffect(() => {
    const noop = () => {};
    document.body.addEventListener("touchstart", noop, { passive: true });
    return () => document.body.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
