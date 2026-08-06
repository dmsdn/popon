// app/TouchActivation.tsx
// 터치 이벤트
"use client";

// [수정] iOS Safari/웹뷰에서 :active 눌림 애니메이션이 작동하도록 touchstart 리스너를 클라이언트 컴포넌트에서 등록하고, passive 옵션으로 스크롤 동작에는 영향을 주지 않도록 수정
import { useEffect } from "react";

export default function TouchActivation() {
  useEffect(() => {
    const noop = () => {};
    document.body.addEventListener("touchstart", noop, { passive: true });
    return () => document.body.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
