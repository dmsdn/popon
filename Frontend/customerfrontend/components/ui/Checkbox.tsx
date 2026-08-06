// components/ui/Checkbox.tsx
// 앱 전체에서 공용으로 쓰는 체크박스
"use client";

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
