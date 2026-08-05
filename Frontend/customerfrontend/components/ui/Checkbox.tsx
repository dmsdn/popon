"use client";

// components/ui/Checkbox.tsx
// [수정 8/5] 화면마다 체크박스 크기(sm/md/lg)와 톤(soft/solid)이 제각각이라
// 디자인을 하나로 통일했어요: 20px(w-5 h-5) 정사각형, 살짝 덜 둥근 모서리
// (rounded-md → rounded), 체크됐을 때 진한 포인트색(bg-point) 배경 + 흰색
// 체크 아이콘. 체크 아이콘이 상자에 비해 작아 보인다는 피드백을 반영해서
// 아이콘 크기도 키웠어요. 실제 <input>은 화면에 안 보이게 숨기고(sr-only)
// 접근성/폼 동작은 그대로 유지해요.

export function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center w-5 h-5 rounded flex-none ${
        checked ? "bg-point" : "bg-gray-100 dark:bg-[#282B32]"
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
          className="w-3.5 h-3.5 pointer-events-none text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}
