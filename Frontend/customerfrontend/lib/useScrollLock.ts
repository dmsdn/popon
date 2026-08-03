// lib/useScrollLock.ts
//
// [신규] 모달 열려있는 동안 배경(뒤쪽 화면)이 스크롤되던 문제 - 처음엔
// body에 overflow: hidden만 걸었는데, 그것만으로는 모바일에서 터치 스크롤이
// 새는 경우가 있었어요. body를 position: fixed로 고정하고(스크롤 위치는
// top 음수값으로 보존) 닫을 때 원래 스크롤 위치로 되돌리는, 좀 더 확실한
// 방식으로 바꿨어요.
import { useEffect } from "react";

export function useScrollLock() {
  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const original = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = original.position;
      body.style.top = original.top;
      body.style.left = original.left;
      body.style.right = original.right;
      body.style.width = original.width;
      body.style.overflow = original.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);
}
