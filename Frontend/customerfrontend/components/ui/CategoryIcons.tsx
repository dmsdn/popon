// components/ui/CategoryIcons.tsx
//
// [수정] 카테고리 아이콘을 컬러 이모지(☕🍽️🖼️ 등) 대신 앱 톤에 맞는 회색 라인
// 아이콘으로 통일했어요. 새 npm 패키지를 추가하지 않으려고(이 프로젝트의
// package.json을 직접 본 적이 없어서 어떤 아이콘 라이브러리가 설치되어 있는지
// 확인할 방법이 없었어요) 전부 인라인 SVG로 직접 만들었습니다.
// 색은 currentColor를 써서, 부모에 text-gray-400 같은 클래스를 주면 그대로 반영돼요.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconCafe(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
      <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8 4v2M12 4v2M16 4v2" />
    </svg>
  );
}

export function IconFood(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3v7a2 2 0 0 0 4 0V3" />
      <path d="M9 10v11" />
      <path d="M17 3c-1.5 0-2.5 1.8-2.5 4s1 4 2.5 5v9" />
    </svg>
  );
}

export function IconArt(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 21h18" />
      <path d="M4 21V9l8-6 8 6v12" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

export function IconPark(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2 6 12h3l-4 6h6" />
      <path d="M12 8l-3 6h3l-3 6h9l-3-6h3l-3-6" />
      <path d="M12 22v-4" />
    </svg>
  );
}

export function IconAquarium(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12c3-4 15-4 18 0-3 4-15 4-18 0Z" />
      <circle cx="9" cy="12" r="0.5" fill="currentColor" />
      <path d="M18 9l3-2v10l-3-2" />
    </svg>
  );
}

export function IconShopping(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function IconSports(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.5 5.5c2 2.5 2 8.5 0 13M18.5 5.5c-2 2.5-2 8.5 0 13" />
    </svg>
  );
}

export function IconMusic(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v4M9 22h6" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" />
      <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
    </svg>
  );
}

export function IconSkyline(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V10l4-3 4 3v11" />
      <path d="M13 21V6l4-2 4 2v15" />
    </svg>
  );
}

export function IconFerrisWheel(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" />
    </svg>
  );
}

export function IconFlask(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 2h6" />
      <path d="M10 2v6.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8.5V2" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

export function IconWalk(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="13" cy="4" r="1.6" />
      <path d="M10 22l1.5-6-2-2 1-5 3 2 3 5.5" />
      <path d="M9 10l-2 1.5v4M12.5 15l3 2 2-1" />
    </svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
    </svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.3" />
    </svg>
  );
}
