// components/ui/ImageWithFallback.tsx
// 이미지 로드 실패 시 대체 화면을 보여주는 이미지 컴포넌트
"use client";

import { useState } from "react";

// 이미지 로드 실패를 감지해서 대신 안내 문구를 보여주는 공용 래퍼
export function ImageWithFallback({
  src,
  alt = "",
  className = "",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-[#282B32] text-gray-400 dark:text-gray-500 text-sm text-center px-1 ${className}`}
      >
        이미지를
        <br />
        불러올 수 없어요
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
