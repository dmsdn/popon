"use client";

import { useState } from "react";

/**
 * 일반 <img>는 로드 실패 시 브라우저 기본 "깨진 이미지" 아이콘이 떠서 사용자 입장에선
 * "빈 이미지처럼" 보여요. 실패를 감지해서 대신 안내 문구를 보여주는 공용 래퍼입니다.
 * (사진이 안 뜨는 근본 원인이 URL 자체가 안 열리는 거라면 - 예: 백엔드가
 * file.base-url에 설정된 주소로 실제 접근 가능한지 - 이건 프론트에서 못 고치는
 * 부분이라, 최소한 깨진 아이콘 대신 이렇게 알아볼 수 있게라도 보여줘요.)
 */
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
      <div className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs text-center px-1 ${className}`}>
        이미지를
        <br />
        불러올 수 없어요
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
