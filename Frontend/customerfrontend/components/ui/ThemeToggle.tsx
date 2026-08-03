"use client";

// 다크모드/라이트모드 전환 토글 스위치.

import { useTheme } from "@/lib/theme/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label="다크모드 전환"
      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${
        isDark ? "bg-point justify-end" : "bg-gray-200 justify-start"
      }`}
    >
      <span className="w-5 h-5 rounded-full bg-white dark:bg-[#282B32] shadow-sm" />
    </button>
  );
}
