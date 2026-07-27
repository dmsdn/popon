"use client";

import { useSyncExternalStore, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  subscribeWishlist,
  getWishlistSnapshot,
  ensureWishlistLoaded,
  toggleWishlist,
} from "@/lib/wishlistStore";
import { saveRedirectTarget } from "@/lib/postLoginRedirect";

export function HeartButton({ popupId, className = "" }: { popupId: number; className?: string }) {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const ids = useSyncExternalStore(subscribeWishlist, getWishlistSnapshot, () => new Set<number>());
  const active = ids.has(popupId);

  useEffect(() => {
    if (isLoggedIn) ensureWishlistLoaded();
  }, [isLoggedIn]);

  return (
    <button
      type="button"
      aria-label={active ? "찜 해제" : "찜하기"}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault(); // 카드 전체가 <Link>인 경우 상세페이지로 이동하는 걸 막음
        e.stopPropagation();
        if (!isLoggedIn) {
          saveRedirectTarget(window.location.pathname);
          router.push("/login");
          return;
        }
        toggleWishlist(popupId);
      }}
      className={`flex items-center justify-center rounded-full bg-white/90 shadow-sm ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "#111827" : "none"} stroke="#111827" strokeWidth="1.8">
        <path d="M12 21s-6.7-4.35-9.3-8.1C.8 9.9 1.8 6 5.2 5c2-.6 3.9.3 4.8 1.9C10.9 5.3 12.8 4.4 14.8 5c3.4 1 4.4 4.9 2.5 7.9C18.7 16.65 12 21 12 21z" />
      </svg>
    </button>
  );
}
