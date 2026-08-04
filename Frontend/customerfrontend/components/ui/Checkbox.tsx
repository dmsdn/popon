"use client";

// components/ui/Checkbox.tsx
// 네이티브 <input type="checkbox">에 accent-color만 주면 브라우저마다 렌더링이
// 달라서(특히 라이트 모드에서 상자 전체가 진한 포인트색으로 꽉 차버려요),
// 체크됐을 때 "연한 포인트색 배경 + 흰색 체크 아이콘", 안 됐을 때 "연한 회색
// 배경"으로 보이도록 직접 그린 체크박스예요. [수정] 테두리(border)를 빼고
// 배경색(면)만으로 구분하도록 바꿨어요. 실제 <input>은 화면에 안 보이게
// 숨기고(sr-only) 접근성/폼 동작은 그대로 유지해요.

export function Checkbox({
  checked,
  onChange,
  size = "md",
}: {
  checked: boolean;
  onChange: () => void;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  const icon = size === "sm" ? "w-2 h-2" : "w-3 h-3";

  return (
    <span
      className={`relative inline-flex items-center justify-center ${box} rounded-md flex-none ${
        checked ? "bg-point-soft" : "bg-gray-100 dark:bg-[#282B32]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      {checked && (
        <svg
          className={`${icon} pointer-events-none text-white`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}
